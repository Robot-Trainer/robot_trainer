import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Return the expected path to the bundled python `dist` directory inside the
 * source tree for tests. Tests pass `path.resolve(__dirname, '..')` so we
 * append `python/dist` to that.
 */
export function getSrcPythonDist(root: string): string {
  return path.join(root, 'python', 'dist');
}

/** Ensure a directory exists (mkdir -p). */
export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/** Remove a directory recursively. */
export async function removeDir(dir: string): Promise<void> {
  try {
    // Node 14+ supports rm with recursive flag.
    await fs.rm(dir, { recursive: true, force: true });
  } catch (e) {
    // fallback to rmdir for older Node versions
    try {
      await fs.rmdir(dir, { recursive: true } as any);
    } catch (err) {
      // ignore
    }
  }
}

/**
 * Create a temporary directory path and return it. The caller may create the
 * directory using `ensureDir` if they want; this helper returns a unique
 * path under the system temp directory.
 */
export function makeTmpPaths(prefix = 'tmp_'): { tmpDir: string } {
  const base = os.tmpdir();
  const name = prefix + Math.random().toString(36).slice(2, 10);
  const tmpDir = path.join(base, name);
  return { tmpDir };
}

export default {
  getSrcPythonDist,
  ensureDir,
  removeDir,
  makeTmpPaths,
};
