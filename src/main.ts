import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import path from 'node:path';
import fs from 'fs/promises';
import os from 'node:os';
import started from 'electron-squirrel-startup';
import { SerialPort } from 'serialport';
import { filterInterestingPorts } from './lib/serial_devices';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { JSDOM } from 'jsdom';
import AdmZip from 'adm-zip';

import { VideoManager } from './lib/VideoManager';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
const videoManagers = new Map<string, VideoManager>();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let systemSettings: any = {};

const loadSystemSettings = async () => {
  // Ask the renderer (which owns the drizzle DB) for the settings.
  // Wait until the main window is ready, then send a request and await a reply.
  try {
    if (!mainWindow) return;
    await new Promise<void>((resolve) => {
      if (mainWindow!.webContents.isLoading()) {
        mainWindow!.webContents.once('did-finish-load', () => resolve());
      } else resolve();
    });

    // Send request to renderer
    mainWindow.webContents.send('request-load-system-settings');

    // Wait for renderer reply, with timeout fallback to existing file-based config
    const data = await new Promise<any>((resolve) => {
      ipcMain.once('reply-load-system-settings', (_ev, payload) => {
        resolve(payload || {});
      });
    });

    systemSettings = data || {};
  } catch (e) {
    throw ("Could not load the system data from the renderer's IndexedDb.")
  }
};

// Resolve a usable `conda` executable path. Returns an absolute path, 'conda' if
// available on PATH, or null if none found.
const resolveCondaExecutable = async (): Promise<string | null> => {
  // 1) If the user has configured a condaRoot in systemSettings, prefer that.
  if (systemSettings && systemSettings.condaRoot) {
    const candidate = path.join(systemSettings.condaRoot, process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'conda.exe' : 'conda');
    try {
      const st = await fs.stat(candidate as any);
      if (st.isFile()) return candidate;
    } catch (e) {
      // ignore
    }
  }

  // 2) Check for a Miniconda we manage under app userData
  try {
    const userDataPath = app.getPath('userData');
    const candidate = path.join(userDataPath, 'miniconda3', 'bin', 'conda');
    const st = await fs.stat(candidate as any);
    if (st.isFile()) return candidate;
  } catch (e) {
    // ignore
  }

  // 3) Check common home locations for conda installer directories
  try {
    const home = app.getPath('home') || os.homedir();
    const common = [
      path.join(home, 'miniconda3', 'bin', 'conda'),
      path.join(home, 'anaconda3', 'bin', 'conda'),
      '/opt/miniconda3/bin/conda',
      '/opt/anaconda3/bin/conda'
    ];
    for (const c of common) {
      try {
        const st = await fs.stat(c as any);
        if (st.isFile()) return c;
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // ignore
  }

  // 4) Finally, check if `conda` is available on PATH
  try {
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync('conda', ['--version'], { encoding: 'utf8' });
    if (result && result.status === 0) return 'conda';
  } catch (e) {
    // not available
  }

  return null;
};

/**
 * Parse robot model XML (MJCF or URDF) to extract metadata.
 * Uses lightweight DOM parsing — no MuJoCo dependency.
 */
function parseRobotXmlMetadata(xmlContent: string): {
  numJoints: number;
  jointNames: string[];
  actuatorNames: string[];
  siteNames: string[];
  hasGripper: boolean;
} {
  const dom = new JSDOM(xmlContent, { contentType: 'text/xml' });
  const doc = dom.window.document;

  const joints = Array.from(doc.querySelectorAll('joint'));
  const jointNames = joints
    .map((j) => j.getAttribute('name'))
    .filter((n): n is string => !!n);

  const actuators = Array.from(doc.querySelectorAll('actuator > *'));
  const actuatorNames = actuators
    .map((a) => a.getAttribute('name'))
    .filter((n): n is string => !!n);

  const sites = Array.from(doc.querySelectorAll('site'));
  const siteNames = sites
    .map((s) => s.getAttribute('name'))
    .filter((n): n is string => !!n);

  const cameras = Array.from(doc.querySelectorAll('camera'));
  const cameraNames = cameras
    .map((c) => c.getAttribute('name'))
    .filter((n): n is string => !!n);

  const hasGripper = actuatorNames.some(
    (n) => /gripper|finger/i.test(n)
  ) || jointNames.some(
    (n) => /gripper|finger/i.test(n)
  );

  return {
    numJoints: jointNames.length,
    jointNames,
    actuatorNames,
    siteNames,
    hasGripper,
    cameras: cameraNames,
  };
}

// Handle Serial port port scanning from renderer process
const setupIpcHandlers = () => {

  ipcMain.handle('get-username', () => {
    return process.env.USER || process.env.USERNAME || 'user';
  });

  ipcMain.handle('get-migrations', async () => {
    let migrationsFolder: string;
    if (app.isPackaged) {
      migrationsFolder = path.join(process.resourcesPath, 'drizzle');
    } else {
      migrationsFolder = path.join(app.getAppPath(), 'drizzle');
    }
    const migrations = readMigrationFiles({ migrationsFolder });
    return migrations;
  });

  ipcMain.handle('save-system-settings', async (_event, settings: any) => {
    // Forward save request to renderer so it can persist via Drizzle (users table)
    try {
      if (mainWindow) {
        mainWindow.webContents.send('request-save-system-settings', settings);

        // Wait for renderer reply (with timeout fallback to file write)
        const result = await new Promise<any>((resolve) => {
          let done = false;
          const to = setTimeout(async () => {
            if (done) return;
            done = true;
            try {
              const p = path.join(app.getPath('userData'), 'system-settings.json');
              systemSettings = { ...systemSettings, ...settings };
              await fs.writeFile(p, JSON.stringify(systemSettings, null, 2), 'utf8');
              mainWindow?.webContents.send('system-settings-changed', systemSettings);
              resolve({ success: true });
            } catch (e) {
              resolve({ success: false, error: String(e) });
            }
          }, 2000);

          ipcMain.once('reply-save-system-settings', (_ev, payload) => {
            if (done) return;
            done = true;
            clearTimeout(to);
            if (payload && payload.success) {
              systemSettings = { ...systemSettings, ...(payload.settings || settings) };
              mainWindow?.webContents.send('system-settings-changed', systemSettings);
            }
            resolve(payload);
          });
        });

        return result;
      }

      // No mainWindow – fallback to file
      const p = path.join(app.getPath('userData'), 'system-settings.json');
      systemSettings = { ...systemSettings, ...settings };
      await fs.writeFile(p, JSON.stringify(systemSettings, null, 2), 'utf8');
      return { success: true };
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  ipcMain.handle('install-miniconda', async () => {
    try {
      const platform = process.platform;
      const arch = process.arch;
      let url = '';
      let installerName = '';

      if (platform === 'linux') {
        url = 'https://repo.anaconda.com/miniconda/Miniconda3-py312_25.11.1-1-Linux-x86_64.sh';
        installerName = 'miniconda.sh';
      } else if (platform === 'darwin') {
        url = arch === 'arm64'
          ? 'https://repo.anaconda.com/miniconda/Miniconda3-py312_25.11.1-1-MacOSX-arm64.sh'
          : 'https://repo.anaconda.com/miniconda/Miniconda3-py312_25.11.1-1-MacOSX-x86_64.sh';
        installerName = 'miniconda.sh';
      } else if (platform === 'win32') {
        url = 'https://repo.anaconda.com/miniconda/Miniconda3-py312_25.11.1-1-Windows-x86_64.exe';
        installerName = 'miniconda.exe';
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      const userDataPath = app.getPath('userData');
      const installerPath = path.join(userDataPath, installerName);
      const installPath = path.join(userDataPath, 'miniconda3');

      // Download
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to download Miniconda: ${response.statusText}`);
      const buffer = await response.arrayBuffer();
      await fs.writeFile(installerPath, Buffer.from(buffer));
      await fs.chmod(installerPath, 0o755);

      // Install
      const { spawn } = await import('node:child_process');
      let args: string[] = [];
      let cmd = '';

      if (platform === 'win32') {
        cmd = installerPath;
        args = ['/InstallationType=JustMe', '/RegisterPython=0', '/S', `/D=${installPath}`];
      } else {
        cmd = '/bin/bash';
        args = [installerPath, '-b', '-p', installPath];
      }

      await new Promise<void>((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: 'inherit' });
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Miniconda installation failed with code ${code}`));
        });
        child.on('error', reject);
      });

      // Cleanup
      await fs.unlink(installerPath);

      // Update in-memory settings so UI can react; renderer may persist this.
      systemSettings = { ...systemSettings, condaRoot: installPath };
      mainWindow?.webContents.send('system-settings-changed', systemSettings);

      return { success: true, path: installPath };
    } catch (error: any) {
      console.error('Error installing Miniconda:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('install-lerobot', async () => {
    try {
      // Prefer using `conda run -n robot_trainer` if we have a conda root saved
      const { spawn } = await import('node:child_process');

      // Determine conda executable using shared helper
      const condaExec: string | null = await resolveCondaExecutable();

      if (condaExec) {
        // Use conda run to ensure the environment is activated for the install
        return await new Promise((resolve) => {
          const child_pip_install = spawn(condaExec, ['install', '-n', 'robot_trainer', 'pip'], { stdio: ['ignore', 'pipe', 'pipe'] });

          let out = '';
          let err = '';
          child_pip_install.stdout.on('data', (d: any) => out += d);
          child_pip_install.stderr.on('data', (d: any) => err += d);
          child_pip_install.on('close', (code) => {
            if (code !== 0) {
              resolve({ success: false, output: out + err });
              return;
            }

            // Resolve python path to safely install lerobot[hilserl] avoiding conda run shell issues
            const child_get_python = spawn(condaExec, ['run', '-n', 'robot_trainer', 'python', '-c', 'import sys; print(sys.executable)'], { stdio: ['ignore', 'pipe', 'pipe'] });
            let pythonExecutable = '';
            child_get_python.stdout.on('data', (d: any) => pythonExecutable += d.toString());
            child_get_python.on('close', (code) => {
              // If we got a python path, use it directly. Otherwise fallback to conda run (which might fail on brackets).
              const targetExec = (code === 0 && pythonExecutable.trim()) ? pythonExecutable.trim() : condaExec;
              const targetArgs = (code === 0 && pythonExecutable.trim())
                ? ['-m', 'pip', 'install', 'lerobot[hilserl]', 'python-socketio', 'aiohttp']
                : ['run', '-n', 'robot_trainer', 'python', '-m', 'pip', 'install', 'lerobot[hilserl]', 'python-socketio', 'aiohttp'];

              const child_hil_install = spawn(targetExec, targetArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
              child_hil_install.stdout.on('data', (d: any) => out += d);
              child_hil_install.stderr.on('data', (d: any) => err += d);
              child_hil_install.on('close', (code) => {
                resolve({ success: code === 0, output: out + err });
              });
              child_hil_install.on('error', (e) => {
                resolve({ success: false, output: String(e) });
              });
            });
            child_get_python.on('error', (e) => {
              // If resolving python fails, try continuing with conda run fallback in the next step logic (handled above)
              // or just fail. Here we rely on the close handler logic which defaults to condaExec if pythonExecutable is empty.
            });
          });
        });
      }

      // Fallback: try direct python binary from systemSettings.pythonPath or usual env location
      let pythonPath = systemSettings.pythonPath;
      if (!pythonPath) {
        console.log("No python path");

        const userDataPath = app.getPath('userData');
        const envPath = path.join(userDataPath, 'miniconda3', 'envs', 'robot_trainer');
        pythonPath = process.platform === 'win32' ? path.join(envPath, 'python.exe') : path.join(envPath, 'bin', 'python');
      }

      return await new Promise((resolve) => {
        const child_hil = spawn(pythonPath, ['-m', 'pip', 'install', 'lerobot[hilserl]', 'python-socketio', 'aiohttp'], { stdio: ['ignore', 'pipe', 'pipe'] });

        let out = '';
        let err = '';
        child_hil.stdout.on('data', (d: any) => out += d);
        child_hil.stderr.on('data', (d: any) => err += d);
        child_hil.on('close', (code) => {
          resolve({ success: code === 0, output: out + err });
        });
        child_hil.on('error', (e) => {
          resolve({ success: false, output: String(e) });
        });
      });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('check-lerobot', async () => {
    try {
      const { spawn } = await import('node:child_process');

      // Prefer conda run if available (ensures correct env activation)
      const condaExec: string | null = await resolveCondaExecutable();

      if (condaExec) {
        return await new Promise((resolve) => {
          const child = spawn(condaExec, ['run', '-n', 'robot_trainer', 'python', '-c', 'import lerobot'], { stdio: ['ignore', 'pipe', 'pipe'] });
          child.on('close', (code) => resolve({ installed: code === 0 }));
          child.on('error', () => resolve({ installed: false }));
        });
      }

      // Fallback: directly call env python if known
      let pythonPath = systemSettings.pythonPath;
      if (!pythonPath) {
        const userDataPath = app.getPath('userData');
        const envPath = path.join(userDataPath, 'miniconda3', 'envs', 'robot_trainer');
        pythonPath = process.platform === 'win32' ? path.join(envPath, 'python.exe') : path.join(envPath, 'bin', 'python');
      }

      return await new Promise((resolve) => {
        const child = spawn(pythonPath, ['-c', 'import lerobot'], { stdio: 'ignore' });
        child.on('close', (code) => resolve({ installed: code === 0 }));
        child.on('error', () => resolve({ installed: false }));
      });
    } catch (e) {
      return { installed: false };
    }
  });

  ipcMain.handle('scan-serial-ports', async () => {
    try {
      const ports = await SerialPort.list();
      return ports.filter(filterInterestingPorts).map(port => {
        return {
          path: port.path,
          manufacturer: port.manufacturer || 'Unknown Manufacturer',
          serialNumber: port.serialNumber || 'N/A',
          productId: port.productId || 'N/A',
          vendorId: port.vendorId || 'N/A',
          pnpId: port.pnpId || 'N/A'
        }
      });
    } catch (error) {
      console.error('Error scanning Serial ports:', error);
      throw error;
    }
  });

  ipcMain.handle('open-video-window', (_event, url) => {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      const q = url === 'simulation' ? '?popoutMode=simulation' : `?popoutUrl=${encodeURIComponent(url)}`;
      win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}${q}`);
    } else {
      const q = url === 'simulation' ? '?popoutMode=simulation' : `?popoutUrl=${encodeURIComponent(url)}`;
      win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), {
        search: q
      });
    }
  });

  // Open the pglite-admin UI in a proper Electron BrowserWindow
  ipcMain.handle('open-admin-window', async (_event, dbName: string = 'robot-trainer') => {
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      autoHideMenuBar: true,
      webPreferences: {
        devTools: true,
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    win.webContents.openDevTools();

    // 1. In Development: use the Vite Dev Server URL which is now configured
    // to serve pglite-admin static files via vite-plugin-static-copy/Vite dev server
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      // While vite-plugin-static-copy is mainly for copying to ./dist, newer versions
      // expose the served assets at root relative paths in dev server.
      // So accessing /pglite-admin/index.html should work if user asks for it.
      const url = `${MAIN_WINDOW_VITE_DEV_SERVER_URL}/pglite-admin/index.html?db=${encodeURIComponent(dbName)}`;
      try {
        await win.loadURL(url);
        win.webContents.once('did-finish-load', () => {
          win.webContents.send('pglite-admin-init', { dbName });
        });
        return { ok: true, url };
      } catch (e) {
        console.error('Failed to load admin from dev server', e);
      }
    }

    // 2. In Production / Packaged App: 
    // The files are copied to the renderer output directory by vite-plugin-static-copy.
    // Structure: resources/app/.vite/renderer/main_window/pglite-admin/index.html
    // OR if using strict built directory structure:
    const prodCandidates = [
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/pglite-admin/index.html`),
      path.join(__dirname, `../renderer/main_window/pglite-admin/index.html`), // explicit name fallback
      path.join(process.resourcesPath, 'pglite-admin/index.html'),
    ];

    for (const cand of prodCandidates) {
      try {
        await fs.access(cand);
        await win.loadFile(cand, { search: `db=${dbName}` });
        win.webContents.once('did-finish-load', () => {
          win.webContents.send('pglite-admin-init', { dbName });
        });
        return { ok: true, path: cand };
      } catch { /* ignore */ }
    }

    // 3. Fallback for mixed environments (run from source but no dev server running?)
    const localFallback = path.resolve(__dirname, '../../pglite-admin/static/index.html');
    try {
      await fs.access(localFallback);
      await win.loadFile(localFallback, { search: `db=${dbName}` });
      win.webContents.once('did-finish-load', () => {
        win.webContents.send('pglite-admin-init', { dbName });
      });
      return { ok: true, path: localFallback };
    } catch { /* ignore */ }

    // If we reach here, nothing matched. Close window to avoid showing app index.
    try { win.close(); } catch (e) { /**/ }
    return { ok: false, error: 'Could not locate pglite-admin index.html' };
  });


  // Check for local Anaconda/conda envs in the user's home directory and via PATH
  ipcMain.handle('check-anaconda', async () => {
    try {
      const home = app.getPath('home') || os.homedir();
      const userData = app.getPath('userData');
      const candidateNames = ['anaconda3', 'Anaconda3', 'miniconda3', 'Miniconda3', 'miniconda', 'Miniconda', 'anaconda2', 'Anaconda2'];
      let condaRoot: string | null = null;

      // Check common locations under the user's home and the app userData folder
      for (const candidate of candidateNames) {
        const homeCandidate = path.join(home, candidate);
        try {
          const st = await fs.stat(homeCandidate);
          if (st && st.isDirectory()) { condaRoot = homeCandidate; break; }
        } catch (e) {
          // ignore
        }
        const userDataCandidate = path.join(userData, candidate);
        try {
          const st2 = await fs.stat(userDataCandidate);
          if (st2 && st2.isDirectory()) { condaRoot = userDataCandidate; break; }
        } catch (e) {
          // ignore
        }
      }

      // Also check if `conda` is available on PATH
      const { spawnSync } = await import('node:child_process');
      let condaAvailable = false;
      let condaVersion = '';
      try {
        const result = spawnSync('conda', ['--version'], { encoding: 'utf8' });
        if (result.status === 0 && result.stdout) {
          condaAvailable = true;
          condaVersion = String(result.stdout).trim();
        }
      } catch (e) {
        // not available
      }

      if (!condaRoot && !condaAvailable) {
        return { found: false, path: null, envs: [], platform: process.platform, condaAvailable, condaVersion };
      }

      const envs: Array<{ name: string; pythonPath?: string | null }> = [];

      if (condaRoot) {
        const envsDir = path.join(condaRoot, 'envs');
        try {
          const entries = await fs.readdir(envsDir, { withFileTypes: true });
          for (const e of entries) {
            if (!e.isDirectory()) continue;
            const envName = e.name;
            const envRoot = path.join(envsDir, envName);
            // check for common python executable locations inside the env
            const candidatesExec: string[] = [];
            if (process.platform === 'win32') {
              candidatesExec.push(path.join(envRoot, 'python.exe'));
              candidatesExec.push(path.join(envRoot, 'Scripts', 'python.exe'));
            } else {
              candidatesExec.push(path.join(envRoot, 'bin', 'python'));
              candidatesExec.push(path.join(envRoot, 'bin', 'python3'));
            }
            let foundExec: string | null = null;
            for (const c of candidatesExec) {
              try {
                const st = await fs.stat(c);
                if (st.isFile()) { foundExec = c; break; }
              } catch (e) {
                // ignore
              }
            }
            envs.push({ name: envName, pythonPath: foundExec });
          }
        } catch (e) {
          // no envs dir or unreadable
        }
      }

      return { found: true, path: condaRoot, envs, platform: process.platform, condaAvailable, condaVersion };
    } catch (error: any) {
      console.error('Error checking Anaconda envs:', error);
      return { found: false, path: null, envs: [], platform: process.platform, error: String(error) };
    }
  });

  ipcMain.handle('create-anaconda-env', async (_event, name: string) => {
    try {
      const { spawn } = await import('node:child_process');
      const home = app.getPath('home') || os.homedir();
      // Build candidate conda executables, preferring any configured condaRoot and app userData
      const userData = app.getPath('userData');

      // Allow helper to short-circuit candidate selection when possible
      let chosen: string | null = null;
      const helperConda = await resolveCondaExecutable();
      if (helperConda) {
        chosen = helperConda;
      } else {
        const candidates: string[] = [];

        // If system had a condaRoot configured, prefer its conda executable
        if (systemSettings && systemSettings.condaRoot) {
          const sysCandidate = path.join(systemSettings.condaRoot, process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'conda.exe' : 'conda');
          candidates.push(sysCandidate);
        }

        // Prefer conda under app userData (where we install Miniconda)
        if (process.platform === 'win32') {
          candidates.push(path.join(userData, 'Miniconda3', 'Scripts', 'conda.exe'));
        } else {
          candidates.push(path.join(userData, 'miniconda3', 'bin', 'conda'));
        }

        // Then check common home locations
        if (process.platform === 'win32') {
          candidates.push(path.join(home, 'Anaconda3', 'condabin', 'conda.bat'));
          candidates.push(path.join(home, 'Anaconda3', 'Scripts', 'conda.exe'));
          candidates.push(path.join(home, 'Miniconda3', 'condabin', 'conda.bat'));
          candidates.push(path.join(home, 'Miniconda3', 'Scripts', 'conda.exe'));
        } else {
          candidates.push(path.join(home, 'miniconda3', 'bin', 'conda'));
          candidates.push(path.join(home, 'anaconda3', 'bin', 'conda'));
          candidates.push('/opt/miniconda3/bin/conda');
          candidates.push('/opt/anaconda3/bin/conda');
        }

        // Finally, allow 'conda' on PATH
        candidates.push('conda');

        // Choose first existing candidate (or 'conda')
        for (const c of candidates) {
          if (c === 'conda') { chosen = 'conda'; break; }
          try {
            const st = await fs.stat(c);
            if (st && st.isFile()) { chosen = c; break; }
          } catch (e) {
            // ignore
          }
        }
        if (!chosen) chosen = 'conda';
      }

      // Explicitly request python to ensure the env contains binaries
      // Using python=3.12 for best compatibility with LeRobot/MuJoCo wheels
      const args = ['create', '-n', name, 'python=3.12', '--yes'];

      return await new Promise((resolve) => {
        const child = spawn(chosen!, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
        let out = '';
        let err = '';
        child.stdout.on('data', (chunk) => out += chunk.toString());
        child.stderr.on('data', (chunk) => err += chunk.toString());
        child.on('close', (code) => {
          const success = code === 0;
          (async () => {
            if (success) {
              // Attempt to determine condaRoot and the env python path, then save to systemSettings
              try {
                let condaRootDetected: string | null = null;
                if (chosen && chosen !== 'conda') {
                  const chosenDir = path.dirname(chosen);
                  const base = path.basename(chosenDir);
                  if (['bin', 'Scripts', 'condabin'].includes(base)) {
                    condaRootDetected = path.dirname(chosenDir);
                  } else {
                    condaRootDetected = chosenDir;
                  }
                }

                // If still not found, leave as null
                const envPython = condaRootDetected ? (process.platform === 'win32' ? path.join(condaRootDetected, 'envs', name, 'python.exe') : path.join(condaRootDetected, 'envs', name, 'bin', 'python')) : null;

                // If python binary missing, try installing python into the env
                if (envPython) {
                  try {
                    const st = await fs.stat(envPython);
                    if (!st.isFile()) throw new Error('python not found');
                  } catch (e) {
                    // Try to install python into the env
                    try {
                      await new Promise<void>((res, rej) => {
                        const installer = spawn(chosen!, ['install', '-n', name, 'python', '--yes'], { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
                        installer.on('close', (c) => c === 0 ? res() : rej(new Error('failed to install python')));
                        installer.on('error', rej);
                      });
                    } catch (_e) {
                      // ignore; env may still be usable via conda run
                    }
                  }
                }

                // Update in-memory settings
                if (condaRootDetected) {
                  systemSettings = { ...systemSettings, condaRoot: condaRootDetected };
                }
                if (envPython) {
                  systemSettings = { ...systemSettings, pythonPath: envPython };
                }
                mainWindow?.webContents.send('system-settings-changed', systemSettings);
              } catch (e) {
                // ignore errors here
              }
            }
            resolve({ success, code: code ?? -1, output: out + (err ? `\n${err}` : '') });
          })();
        });
        child.on('error', (e) => {
          resolve({ success: false, code: -1, output: String(e) });
        });
      });
    } catch (error: any) {
      console.error('Error creating conda env:', error);
      return { success: false, code: -1, output: String(error) };
    }
  });

  ipcMain.handle('save-robot-config', async (_event, config: any) => {
    try {
      const home = app.getPath('home');
      const dir = path.join(home, 'robot_trainer');
      const outPath = path.join(dir, 'config.json');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(outPath, JSON.stringify(config, null, 2), 'utf8');
      return { ok: true, path: outPath };
    } catch (error) {
      console.error('Error saving robot config:', error);
      throw error;
    }
  });

  ipcMain.handle('get-simulation-state', () => {
    const vm = videoManagers.get('simulation');
    if (vm) {
      return { running: true, wsUrl: vm.wsUrl };
    }
    return { running: false };
  });

  // Start a simulation process (spawns Python simulator) and stream frames
  ipcMain.handle('start-simulation', async (_event, config: any = {}) => {
    try {
      const id = 'simulation';
      if (videoManagers.has(id)) {
        return { ok: false, message: 'simulation already running' };
      }

      // Write the config object to a temporary JSON file
      const tempId = Date.now();
      const tempConfigPath = path.join(app.getPath('temp'), `lerobot_config_${tempId}.json`);
      await fs.writeFile(tempConfigPath, JSON.stringify(config, null, 2), 'utf8');

      // Build command/args based on user's system settings and provided config
      // Prefer conda run -n robot_trainer if we have conda available
      const condaExec: string | null = await resolveCondaExecutable();

      // let moduleName = 'lerobot.scripts.lerobot_record';
      // let scriptArgs = ['-m', moduleName, '--config_path', tempConfigPath];

      // If user selected generic simulation, run our custom simulate.py script
      // if ((config.robot && config.robot.type === 'simulation') || config.env) {
      const simScriptPath = app.isPackaged
        ? path.join(process.resourcesPath, 'python', 'gym_manipulator.py')
        : path.join(app.getAppPath(), 'src', 'python', 'gym_manipulator.py');

      let scriptArgs = [simScriptPath, '--config_path', tempConfigPath];
      // }

      let command = 'python3';
      let args: string[] = scriptArgs;

      // Use conda run to ensure correct env activation
      command = condaExec;
      // if (config.robot && config.robot.type === 'simulation') {
      args = ['run', '--no-capture-output', '-n', 'robot_trainer', 'python', '-u', ...scriptArgs];
      // } else {
      // args = ['run', '-n', 'robot_trainer', 'python', ...scriptArgs];
      // }
      // } else if (systemSettings && systemSettings.pythonPath) {

      // command = systemSettings.pythonPath;
      // args = scriptArgs;
      // }

      const vm = new VideoManager();
      // const recordingPath = path.join(app.getPath('userData'), `simulation_${Date.now()}.mp4`);

      // Prepare to capture the dynamic URL from the python process
      const waitForUrl = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout waiting for simulation server URL"));
        }, 15000); // 15s timeout

        const onResponse = (response: any) => {
          if (response.type === 'server-ready' && response.url) {
            clearTimeout(timeout);
            vm.off('simulation-response', onResponse);
            resolve(response.url);
          } else if (response.type === 'error') {
            clearTimeout(timeout);
            vm.off('simulation-response', onResponse);
            reject(new Error(response.message || 'Simulation error'));
          }
        };
        vm.on('simulation-response', onResponse);

        // Also listen for errors that happen AFTER initialization
        const onError = (response: any) => {
          if (response.type === 'error') {
            BrowserWindow.getAllWindows().forEach(w => w.webContents.send('simulation-error', response));
          }
        };
        vm.on('simulation-response', onError);

        // Also reject if process exits early
        const onExit = (code: number) => {
          clearTimeout(timeout);
          vm.off('simulation-response', onResponse);
          // If we exit early (during startup), we reject.
          // If we resolved already, this reject is ignored.
          reject(new Error(`Simulation process exited early with code ${code}`));
          // We can remove the error listener since the process is dead
          vm.off('simulation-response', onError);
        };
        vm.once('exit', onExit);
      });

      await vm.startSimulation(command, args);
      videoManagers.set(id, vm);

      let wsUrl = '';
      try {
        wsUrl = await waitForUrl;
        vm.wsUrl = wsUrl;
      } catch (e) {
        console.warn('Failed to get dynamic URL from simulation, falling back cleanly or erroring:', e);
        // If we fail to start properly, clean up the VM so we don't leave zombie processes or stuck listeners?
        vm.stopAll();
        videoManagers.delete(id);
        throw e;
      }

      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('simulation-state-changed', { running: true, wsUrl }));

      return { ok: true, wsUrl };
    } catch (error) {
      console.error('start-simulation failed', error);
      throw error;
    }
  });

  ipcMain.handle('stop-simulation', async () => {
    const id = 'simulation';
    const vm = videoManagers.get(id);
    if (vm) {
      vm.stopAll();
      videoManagers.delete(id);
    }
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('simulation-state-changed', { running: false }));
    return { ok: true };
  });

  ipcMain.handle('start-camera', async (_event, devicePath: string) => {
    return { ok: false, message: 'Camera support disabled' };
  });

  ipcMain.handle('start-rtsp', async (_event, url: string) => {
    return { ok: false, message: 'RTSP support disabled' };
  });

  ipcMain.handle('stop-video', async (_event, id: string) => {
    const vm = videoManagers.get(id);
    if (vm) {
      vm.stopAll();
      videoManagers.delete(id);
    }
    return { ok: true };
  });

  // Select a model file (MJCF/ZIP) via native file dialog
  ipcMain.handle('select-model-file', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Robot Model File',
      filters: [
        { name: 'Robot Models', extensions: ['xml', 'zip'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Read a model file and parse metadata from its XML content
  ipcMain.handle('read-model-file', async (_event, filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.zip') {
      try {
        const zip = new AdmZip(filePath);
        const zipEntries = zip.getEntries();
        const xmlEntry = zipEntries.find(e => e.entryName.endsWith('.xml') && !e.entryName.startsWith('__MACOSX'));

        if (xmlEntry) {
          const content = zip.readAsText(xmlEntry);
          const metadata = parseRobotXmlMetadata(content);
          const baseName = path.basename(filePath, ext);
          return { content: '', format: 'zip', baseName, metadata, zipPath: filePath };
        }
      } catch (e) {
        console.error("Error reading zip", e);
      }
      return { content: '', format: 'zip', baseName: path.basename(filePath, ext), metadata: {} };
    }

    if (ext === '.urdf') {
      throw new Error("URDF files are not supported. Please use MJCF (.xml) files.");
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const format = 'mjcf';
    const baseName = path.basename(filePath, ext);
    const metadata = parseRobotXmlMetadata(content);
    return { content, format, baseName, metadata };
  });

  ipcMain.handle('save-robot-model-zip', async (_event, sourceFilePath: string) => {
    const userDataPath = app.getPath('userData');
    const modelsDir = path.join(userDataPath, 'robot_models');
    // Ensure base directory exists
    await fs.mkdir(modelsDir, { recursive: true });

    const fileName = path.basename(sourceFilePath);
    const baseName = path.basename(fileName, path.extname(fileName));

    // Add date_time suffix YYYYMMDD_HHMMSS
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const dirName = `${baseName}_${timestamp}`;
    const targetDir = path.join(modelsDir, dirName);

    const zipPath = path.join(targetDir, fileName);
    const extractDir = path.join(targetDir, 'extracted');

    await fs.mkdir(targetDir, { recursive: true });

    // Copy zip file to destination
    await fs.copyFile(sourceFilePath, zipPath);

    // Extract
    // Note: AdmZip synchronous extraction might freeze UI for large files, but acceptable for now.
    const zip = new AdmZip(zipPath);
    // Clear extract dir if exists?
    await fs.rm(extractDir, { recursive: true, force: true });
    await fs.mkdir(extractDir, { recursive: true });

    zip.extractAllTo(extractDir, true);

    return { modelPath: extractDir };
  });

  ipcMain.handle('scan-mujoco-menagerie', async () => {
    const menageriePath = path.join(process.cwd(), 'mujoco_menagerie');
    const results = {
      robots: [] as any[],
      configurations: [] as any[]
    };

    try {
      const dirs = await fs.readdir(menageriePath, { withFileTypes: true });
      for (const dirent of dirs) {
        if (!dirent.isDirectory() || dirent.name.startsWith('.')) continue;

        const dirPath = path.join(menageriePath, dirent.name);
        const files = await fs.readdir(dirPath);

        // Stage 1: Robot Detection
        for (const file of files) {
          if (!file.endsWith('.xml') || file.toLowerCase().includes('scene')) continue;

          const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
          if (content.includes('<actuator>')) {
            const metadata = parseRobotXmlMetadata(content);
            results.robots.push({
              name: dirent.name, // Robot name is directory name
              dirName: dirent.name,
              modelPath: path.join('mujoco_menagerie', dirent.name, file),
              metadata
            });
            break; // One robot per folder
          }
        }

        // Stage 2: Configuration Detection
        for (const file of files) {
          if (!file.endsWith('.xml')) continue;
          const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
          // Check for model attribute containing "scene"
          const modelMatch = content.match(/<mujoco[^>]*model="([^"]*scene[^"]*)"/i);
          if (modelMatch) {
            const includeMatches = Array.from(content.matchAll(/<include[^>]*file="([^"]+)"/g));
            const includedRobots = includeMatches.map(m => {
              const resolved = path.resolve(dirPath, m[1]);
              const includeDir = path.dirname(resolved);
              return path.basename(includeDir);
            });

            results.configurations.push({
              name: modelMatch[1],
              sceneXmlPath: path.join('mujoco_menagerie', dirent.name, file),
              includedRobots
            });
          }
        }
      }
    } catch (e) {
      console.error("Error scanning menagerie:", e);
    }
    return results;
  });

  ipcMain.handle('save-robot-model-file', async (_event, sourceFilePath: string) => {
    const userDataPath = app.getPath('userData');
    const modelsDir = path.join(userDataPath, 'robot_models');
    // Ensure base directory exists
    await fs.mkdir(modelsDir, { recursive: true });

    const fileName = path.basename(sourceFilePath);
    const baseName = path.basename(fileName, path.extname(fileName));

    // Add date_time suffix YYYYMMDD_HHMMSS
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const dirName = `${baseName}_${timestamp}`;
    const targetDir = path.join(modelsDir, dirName);

    await fs.mkdir(targetDir, { recursive: true });

    const destPath = path.join(targetDir, fileName);
    await fs.copyFile(sourceFilePath, destPath);

    return { modelPath: destPath };
  });

  // Provide pglite assets to renderer via IPC (renderer can't read node files)
  ipcMain.handle('get-pglite-asset', async (_event, name: string) => {
    const candidates = [
      // Dev / tests: node_modules copy
      path.resolve(process.cwd(), 'node_modules', '@electric-sql', 'pglite', 'dist', name),
      // Built renderer next to main bundle: ../renderer/<name> (matches createWindow loadFile)
      path.join(__dirname, '..', 'renderer', MAIN_WINDOW_VITE_NAME, name),
      path.join(__dirname, 'assets', name),
      // Built renderer assets folder
      path.join(__dirname, '..', 'renderer', MAIN_WINDOW_VITE_NAME, 'assets', name),
      // Fallback: renderer root next to main
      path.join(__dirname, '..', 'renderer', name),
      // Packaged app resources
      path.join(process.resourcesPath, 'renderer', MAIN_WINDOW_VITE_NAME, name),
      path.join(process.resourcesPath, 'app', 'renderer', MAIN_WINDOW_VITE_NAME, name),
      path.join(process.resourcesPath, name),
    ];

    for (const p of candidates) {
      try {
        const data = await fs.readFile(p);
        return data.toString('base64');
      } catch (_e) {
        // try next
      }
    }

    const err = new Error(`pglite asset not found (tried ${candidates.join(', ')})`);
    console.error('Error reading pglite asset', name, err);
    throw err;
  });
};

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: true
    },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

const setupAppMenu = () => {
  const isMac = process.platform === 'darwin';
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Setup Wizard',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('open-setup-wizard');
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    }
  ];

  if (isMac) {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  loadSystemSettings();
  setupIpcHandlers();
  createWindow();
  setupAppMenu();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
