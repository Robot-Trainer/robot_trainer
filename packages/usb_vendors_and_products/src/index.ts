import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';

export type VendorRecord = {
    company: string;
    vendorId: string;
};

export const parseVendorText = (rawText: string): VendorRecord[] => {
    const records: VendorRecord[] = [];
    const lines = rawText.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }

        // Vendor IDs in this source are typically 4-5 chars and may contain hex digits.
        const match = trimmed.match(/^(.*?)\s+([0-9A-Fa-f]{4,5})$/);
        if (!match) {
            continue;
        }

        const company = match[1].trim();
        const vendorId = match[2].toUpperCase();
        if (!company) {
            continue;
        }

        records.push({ company, vendorId });
    }

    return records;
};

const toCsv = (records: VendorRecord[]): string => {
    const rows: string[][] = [['Company', 'Vendor ID']];
    for (const record of records) {
        rows.push([record.company, record.vendorId]);
    }

    return rows
        .map((row) => row.map((field) => `"${field.replace(/"/g, '""')}"`).join(','))
        .join('\n');
};

export async function parseVendorPdf(inputPath: string, outputPath: string): Promise<{ records: number }> {
    const dataBuffer = fs.readFileSync(inputPath);
    const parser = new PDFParse({ data: dataBuffer });

    try {
        const textResult = await parser.getText();
        const records = parseVendorText(textResult.text);
        const csvOutput = toCsv(records);

        fs.writeFileSync(outputPath, csvOutput, 'utf8');
        return { records: records.length };
    } finally {
        await parser.destroy();
    }
}

export async function runCli(inputArg?: string, outputArg?: string): Promise<void> {
    const inputPdf = path.resolve(process.cwd(), inputArg ?? 'vendor_ids051920_0.pdf');
    const outputCsv = path.resolve(process.cwd(), outputArg ?? 'vendor_ids.csv');

    const result = await parseVendorPdf(inputPdf, outputCsv);
    console.log(`Success: CSV saved to ${outputCsv}`);
    console.log(`Total records found: ${result.records}`);
}

if (require.main === module) {
    runCli(process.argv[2], process.argv[3]).catch((error) => {
        console.error('Error parsing PDF:', error);
        process.exitCode = 1;
    });
}

export type UsbEntry = {
  vendorId: number;
  productId: number;
  vendorName?: string;
  productName?: string;
};

export const formatId = (v: number) => `0x${v.toString(16).padStart(4, '0')}`;

export const makeKey = (v: number, p: number) => `${formatId(v)}:${formatId(p)}`;

export default {
  makeKey,
  formatId,
};
