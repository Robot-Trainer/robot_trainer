import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import path from 'path';

import runPythonScanner from './python_scanner';
import { getSrcPythonDist, ensureDir, removeDir, makeTmpPaths } from './test_fixtures';

const distDir = getSrcPythonDist(path.resolve(__dirname, '..'));
const binName = process.platform === 'win32' ? 'robot_trainer_py.exe' : 'robot_trainer_py';
const binPath = path.join(distDir, binName);

beforeEach(async () => {
	await fs.mkdir(distDir, { recursive: true });
});

afterEach(async () => {
	// cleanup any created binary
	try { await fs.unlink(binPath); } catch { }
	try { await removeDir(distDir); } catch { }
});

describe('runPythonScanner edge cases', () => {
	it('parses valid JSON from bundled binary', async () => {
		const content = `#!/usr/bin/env bash\necho '{"robots": [{"name": "r1"}], "teleoperators": []}'`;
		await fs.writeFile(binPath, content, { mode: 0o755 });

		const res = await runPythonScanner();
		expect(res).toHaveProperty('robots');
		expect(Array.isArray(res.robots)).toBe(true);
		expect(res.robots[0].name).toBe('r1');
	});

	it('rejects when bundled binary exits non-zero', async () => {
		const content = `#!/usr/bin/env bash\necho 'err' >&2\nexit 2`;
		await fs.writeFile(binPath, content, { mode: 0o755 });

		await expect(runPythonScanner()).rejects.toBeTruthy();
	});

	it('rejects when bundled binary prints invalid JSON', async () => {
		const content = `#!/usr/bin/env bash\necho 'not json'`;
		await fs.writeFile(binPath, content, { mode: 0o755 });

		await expect(runPythonScanner()).rejects.toBeTruthy();
	});

	it('falls back to provided pythonPath and returns JSON', async () => {
		// create a fake 'python' executable script that ignores args and prints JSON
		const tmp = makeTmpPaths('fake_py_');
		const fakePy = path.join(tmp.tmpDir, 'fake_py.sh');
		await ensureDir(tmp.tmpDir);
		const content = `#!/usr/bin/env bash\necho '{"robots": [], "teleoperators": [{"name":"t1"}]}'`;
		await fs.writeFile(fakePy, content, { mode: 0o755 });

		const res = await runPythonScanner({ pythonPath: fakePy });
		expect(res).toHaveProperty('teleoperators');
		expect(res.teleoperators[0].name).toBe('t1');

		// cleanup
		await removeDir(tmp.tmpDir);
	});

	it('forwards --robots args to binary', async () => {
		const script = `#!/usr/bin/env bash
r=()
while (( "$#" )); do
	if [ "$1" = "--robots" ]; then
		shift
		while [ "$#" -gt 0 ] && [ "\${1:0:2}" != "--" ]; do
			r+=("$1")
			shift
		done
	else
		shift
	fi
done
printf '{"robots": ['
first=1
for x in "\${r[@]}"; do
	if [ $first -eq 1 ]; then printf "%s" "\\"$x\\""; first=0; else printf ",%s" "\\"$x\\""; fi
done
printf '], "teleoperators": []}\\n'`;

		await fs.writeFile(binPath, script, { mode: 0o755 });

		const res = await runPythonScanner({ robots: ['rA', 'rB'] });
		expect(res).toHaveProperty('robots');
		expect(res.robots).toEqual(['rA', 'rB']);
	});
});

