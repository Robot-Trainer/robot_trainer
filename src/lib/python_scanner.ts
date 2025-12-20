import path from 'node:path';
import fs from 'fs/promises';

type Options = { pythonPath?: string; robots?: string[]; teleops?: string[] } | undefined;

export async function runPythonScanner(options?: Options): Promise<any> {
  const appDir = path.join(__dirname, '..');
  const pythonBundlePaths = [
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'python', 'dist', process.platform === 'win32' ? 'robot_trainer_py.exe' : 'robot_trainer_py'),
    path.join(process.resourcesPath || '', 'dist', process.platform === 'win32' ? 'robot_trainer_py.exe' : 'robot_trainer_py'),
    path.join(appDir, 'python', 'dist', process.platform === 'win32' ? 'robot_trainer_py.exe' : 'robot_trainer_py'),
  ];

  const args: string[] = [];
  if (options?.robots && options.robots.length) args.push('--robots', ...options.robots);
  if (options?.teleops && options.teleops.length) args.push('--teleops', ...options.teleops);

  const { spawn } = await import('node:child_process');

  // look for a bundled binary
  let chosenBinary: string | null = null;
  for (const p of pythonBundlePaths) {
    try {
      const st = await fs.stat(p);
      if (st && st.isFile()) { chosenBinary = p; break; }
    } catch (e) {
      // ignore
    }
  }

  if (chosenBinary) {
    return await new Promise((resolve, reject) => {
      const child = spawn(chosenBinary!, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      child.stdout.on('data', (chunk) => out += chunk.toString());
      child.stderr.on('data', (chunk) => err += chunk.toString());
      child.on('close', (code) => {
        if (code !== 0) return reject(new Error(err || `python bundle exited ${code}`));
        try { resolve(JSON.parse(out || '{}')); } catch (e) { reject(e); }
      });
      child.on('error', (e) => reject(e));
    });
  }

  // fallback to running the script with python
  const pythonExec = (options && options.pythonPath) ? options.pythonPath : 'python3';
  const scriptPath = path.join(__dirname, '..', 'python', 'main.py');

  return await new Promise((resolve, reject) => {
    const child = spawn(pythonExec, [scriptPath, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => out += chunk.toString());
    child.stderr.on('data', (chunk) => err += chunk.toString());
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || `python exited ${code}`));
      try { resolve(JSON.parse(out || '{}')); } catch (e) { reject(e); }
    });
    child.on('error', (e) => reject(e));
  });
}

export default runPythonScanner;
