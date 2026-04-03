import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { makeKey, parseVendorPdf, parseVendorText } from '../src/index';
import { afterEach, test, expect } from 'vitest';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

test('makeKey produces formatted key', () => {
  expect(makeKey(0x1234, 0xabcd)).toBe('0x1234:0xabcd');
});

test('parseVendorText extracts company and vendor IDs from text', () => {
  const sample = [
    'Acme Devices 1A2B',
    'Example Corp 12345',
    'not a vendor line',
  ].join('\n');

  expect(parseVendorText(sample)).toEqual([
    { company: 'Acme Devices', vendorId: '1A2B' },
    { company: 'Example Corp', vendorId: '12345' },
  ]);
});

test('parseVendorPdf writes CSV with header and parsed rows', async () => {
  const packageRoot = path.resolve(__dirname, '..');
  const inputPdf = path.join(packageRoot, 'vendor_ids051920_0.pdf');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'usb-vendor-test-'));
  tempDirs.push(tempDir);
  const outputCsv = path.join(tempDir, 'vendor_ids.csv');

  const result = await parseVendorPdf(inputPdf, outputCsv);
  const csv = fs.readFileSync(outputCsv, 'utf8');
  const lines = csv.trim().split(/\r?\n/);

  expect(result.records).toBeGreaterThan(1000);
  expect(lines[0]).toBe('"Company","Vendor ID"');
  expect(lines.length - 1).toBe(result.records);

  const rowPattern = /^".+","[0-9A-F]{4,5}"$/;
  expect(lines.slice(1, 100).every((line) => rowPattern.test(line))).toBe(true);
});
