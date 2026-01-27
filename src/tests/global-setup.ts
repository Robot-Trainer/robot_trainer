import { FullConfig } from '@playwright/test';
import { spawnSync } from 'child_process';

export default async function globalSetup(_config: FullConfig) {
  console.log('Global Setup: Starting...');

  const run = (cmd: string, args: string[]) => {
    console.log(`Global Setup: Running ${cmd} ${args.join(" ")}`);
    const env = { ...process.env };

    // sanitize problematic env vars
    Object.keys(env).forEach((k) => {
      if (
        k === "NODE_OPTIONS" ||
        k.startsWith("TS_NODE_") ||
        k.startsWith("ELECTRON_")
      ) {
        delete env[k];
      }
    });

    const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, env });
    if (r.status !== 0) {
      throw new Error(
        `${cmd} ${args.join(" ")} failed with status ${r.status}`,
      );
    }
  };

  run('npm', ['run', 'db:generate']);
  // Note: 'npm run package' builds the app for distribution using electron-forge.
  run('npm', ['run', 'package']);
  console.log('Global Setup: Completed.');
}