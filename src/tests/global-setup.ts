import { FullConfig } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'node:path';
import fs from 'node:fs';

export default async function globalSetup(_config: FullConfig) {
  console.log('Global Setup: Starting...');
  console.log('DISPLAY env var:', process.env.DISPLAY);
  console.log('HOME env var:', process.env.HOME);

  // Robustly find nvm-managed Node to avoid system Node (v18) issues with Vite/Forge
  const nvmNodeBin = (() => {
    // 1. Try nvm via shell (flaky in non-interactive shells)
    const nvmDirEnv = process.env.NVM_DIR;
    const homeDir = process.env.HOME || '/home/bernie';
    const nvmDirs = [
      nvmDirEnv,
      path.join(homeDir, '.nvm'),
      '/home/bernie/.nvm'
    ].filter(Boolean) as string[];

    // 2. Scan directories for versions
    for (const baseDir of nvmDirs) {
      if (!fs.existsSync(baseDir)) continue;
      const versionsDir = path.join(baseDir, 'versions', 'node');
      if (!fs.existsSync(versionsDir)) continue;

      try {
        const entries = fs.readdirSync(versionsDir, { withFileTypes: true })
          .filter(e => e.isDirectory())
          .map(e => e.name)
          // Sort version strings (simplistic but works for v20 vs v18)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
          .reverse();

        if (entries.length > 0) {
          const candidate = path.join(versionsDir, entries[0], 'bin');
          if (fs.existsSync(path.join(candidate, 'node'))) {
            console.log(`Global Setup: Found nvm node at ${candidate}`);
            return candidate;
          }
        }
      } catch (e) {
        console.warn('Global Setup: Error finding nvm node:', e);
      }
    }

    console.warn('Global Setup: Could not find nvm node, falling back to system node.');
    return undefined;
  })();

  const run = (cmd: string, args: string[]) => {
    console.log(`Global Setup: Running ${cmd} ${args.join(' ')}`);
    // Capture output to debug failure
    const env = { ...process.env };

    // Sanitize environment to prevent conflicts from the parent process (VS Code, Playwright, or npm)
    Object.keys(env).forEach(key => {
      // Remove NODE_OPTIONS (often set by VS Code or test runners)
      // Remove TS_NODE_* (can conflict with electron-forge's use of ts-node)
      // Remove ELECTRON_* (can interfere with forge's electron handling)
      if (key === 'NODE_OPTIONS' || key.startsWith('TS_NODE_') || key.startsWith('ELECTRON_')) {
        delete env[key];
      }
    });

    if (nvmNodeBin && env.PATH && !env.PATH.includes(nvmNodeBin)) {
      env.PATH = `${nvmNodeBin}:${env.PATH}`;
    }

    const resolvedCmd = (() => {
      if (!nvmNodeBin) return cmd;
      // Prefer absolute npm/node from nvm to avoid shell PATH issues
      const candidate = path.join(nvmNodeBin, cmd);
      return fs.existsSync(candidate) ? candidate : cmd;
    })();

    // Note: We deliberately keep PATH and basic system vars.
    // We also keep npm_* vars because stripping them can break npm's ability to find node_modules executable bins 
    // unless we strictly manage PATH, but usually nested npm works fine if NODE_OPTIONS is clear.

    // Debugging: Log key environment details
    console.log('--- Global Setup Debug Info ---');
    console.log('CWD:', process.cwd());
    const debugProc = spawnSync(resolvedCmd === cmd ? 'npm' : resolvedCmd, ['--version'], { encoding: 'utf-8', shell: true, env });
    console.log('npm version (in shell):', debugProc.stdout.trim());
    const debugNode = spawnSync(resolvedCmd === cmd ? 'node' : path.join(nvmNodeBin ?? '', 'node'), ['--version'], { encoding: 'utf-8', shell: true, env });
    console.log('node version (in shell):', debugNode.stdout.trim());
    console.log('PATH:', env.PATH);
    console.log('-------------------------------');

    const r = spawnSync(resolvedCmd, args, { stdio: 'pipe', shell: true, encoding: 'utf-8', env });
    if (r.status !== 0) {
      const output = r.stdout + '\n' + r.stderr;
      console.error(output);
      throw new Error(`${cmd} ${args.join(' ')} failed with status ${r.status}.\nOutput:\n${output}`);
    } else {
      // Print stdout if successful, useful for debugging
      console.log(r.stdout);
    }
  };

  run('npm', ['run', 'db:generate']);
  // Note: 'npm run package' builds the app for distribution using electron-forge.
  run('npm', ['run', 'package']);
  console.log('Global Setup: Completed.');
}