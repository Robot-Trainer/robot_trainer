// Dynamixel Protocol 2.0 CRC-16 lookup table (from official SDK)
// prettier-ignore
export const CRC_TABLE: readonly number[] = [
0x0000, 0x8005, 0x800F, 0x000A, 0x801B, 0x001E, 0x0014, 0x8011,
0x8033, 0x0036, 0x003C, 0x8039, 0x0028, 0x802D, 0x8027, 0x0022,
0x8063, 0x0066, 0x006C, 0x8069, 0x0078, 0x807D, 0x8077, 0x0072,
0x0050, 0x8055, 0x805F, 0x005A, 0x804B, 0x004E, 0x0044, 0x8041,
0x80C3, 0x00C6, 0x00CC, 0x80C9, 0x00D8, 0x80DD, 0x80D7, 0x00D2,
0x00F0, 0x80F5, 0x80FF, 0x00FA, 0x80EB, 0x00EE, 0x00E4, 0x80E1,
0x00A0, 0x80A5, 0x80AF, 0x00AA, 0x80BB, 0x00BE, 0x00B4, 0x80B1,
0x8093, 0x0096, 0x009C, 0x8099, 0x0088, 0x808D, 0x8087, 0x0082,
0x8183, 0x0186, 0x018C, 0x8189, 0x0198, 0x819D, 0x8197, 0x0192,
0x01B0, 0x81B5, 0x81BF, 0x01BA, 0x81AB, 0x01AE, 0x01A4, 0x81A1,
0x01E0, 0x81E5, 0x81EF, 0x01EA, 0x81FB, 0x01FE, 0x01F4, 0x81F1,
0x81D3, 0x01D6, 0x01DC, 0x81D9, 0x01C8, 0x81CD, 0x81C7, 0x01C2,
0x0140, 0x8145, 0x814F, 0x014A, 0x815B, 0x015E, 0x0154, 0x8151,
0x8173, 0x0176, 0x017C, 0x8179, 0x0168, 0x816D, 0x8167, 0x0162,
0x8123, 0x0126, 0x012C, 0x8129, 0x0138, 0x813D, 0x8137, 0x0132,
0x0110, 0x8115, 0x811F, 0x011A, 0x810B, 0x010E, 0x0104, 0x8101,
0x8303, 0x0306, 0x030C, 0x8309, 0x0318, 0x831D, 0x8317, 0x0312,
0x0330, 0x8335, 0x833F, 0x033A, 0x832B, 0x032E, 0x0324, 0x8321,
0x0360, 0x8365, 0x836F, 0x036A, 0x837B, 0x037E, 0x0374, 0x8371,
0x8353, 0x0356, 0x035C, 0x8359, 0x0348, 0x834D, 0x8347, 0x0342,
0x03C0, 0x83C5, 0x83CF, 0x03CA, 0x83DB, 0x03DE, 0x03D4, 0x83D1,
0x83F3, 0x03F6, 0x03FC, 0x83F9, 0x03E8, 0x83ED, 0x83E7, 0x03E2,
0x83A3, 0x03A6, 0x03AC, 0x83A9, 0x03B8, 0x83BD, 0x83B7, 0x03B2,
0x0390, 0x8395, 0x839F, 0x039A, 0x838B, 0x038E, 0x0384, 0x8381,
0x0280, 0x8285, 0x828F, 0x028A, 0x829B, 0x029E, 0x0294, 0x8291,
0x82B3, 0x02B6, 0x02BC, 0x82B9, 0x02A8, 0x82AD, 0x82A7, 0x02A2,
0x82E3, 0x02E6, 0x02EC, 0x82E9, 0x02F8, 0x82FD, 0x82F7, 0x02F2,
0x02D0, 0x82D5, 0x82DF, 0x02DA, 0x82CB, 0x02CE, 0x02C4, 0x82C1,
0x8243, 0x0246, 0x024C, 0x8249, 0x0258, 0x825D, 0x8257, 0x0252,
0x0270, 0x8275, 0x827F, 0x027A, 0x826B, 0x026E, 0x0264, 0x8261,
0x0220, 0x8225, 0x822F, 0x022A, 0x823B, 0x023E, 0x0234, 0x8231,
0x8213, 0x0216, 0x021C, 0x8219, 0x0208, 0x820D, 0x8207, 0x0202,
];

export function calcCrc(data: Uint8Array): number {
let crc = 0;
for (let j = 0; j < data.length; j += 1) {
const i = ((crc >> 8) ^ data[j]) & 0xff;
crc = ((crc << 8) ^ CRC_TABLE[i]) & 0xffff;
}
return crc;
}

export function hasHeaderAt(buffer: Uint8Array, start: number): boolean {
if (buffer.length < start + 4) return false;
return (
buffer[start] === 0xff &&
buffer[start + 1] === 0xff &&
buffer[start + 2] === 0xfd &&
buffer[start + 3] === 0x00
);
}

export function concatUint8(a: Uint8Array, b: Uint8Array): Uint8Array {
const out = new Uint8Array(a.length + b.length);
out.set(a, 0);
out.set(b, a.length);
return out;
}

const DXL_INSTRUCTION_READ = 0x02;
const DXL_STATUS = 0x55;
const HEADER = Uint8Array.from([0xff, 0xff, 0xfd, 0x00]);

export class PortHandler {
private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

constructor(private readonly port: SerialPort) {}

async openPort(baudRate: number): Promise<boolean> {
try {
await this.port.open({ baudRate });
this.writer = this.port.writable.getWriter();
this.reader = this.port.readable.getReader();
return true;
} catch (error) {
console.error('Failed to open port:', error);
return false;
}
}

async closePort(): Promise<void> {
if (this.reader) {
try {
await this.reader.cancel();
} catch {
// Ignore
}
this.reader.releaseLock();
this.reader = null;
}
if (this.writer) {
try {
await this.writer.close();
} catch {
// Ignore
}
this.writer.releaseLock();
this.writer = null;
}
if (this.port) {
try {
await this.port.close();
} catch {
// Ignore
}
}
}

async write(buffer: Uint8Array): Promise<void> {
if (!this.writer) {
throw new Error('Port is not open for writing');
}
await this.writer.write(buffer);
}

async readAtLeast(minBytes: number, timeoutMs = 300): Promise<Uint8Array> {
if (!this.reader) {
throw new Error('Port is not open for reading');
}

let chunks = new Uint8Array(0);
const deadline = Date.now() + timeoutMs;

while (chunks.length < minBytes && Date.now() < deadline) {
const timeoutPromise = new Promise<{ value: undefined; done: true }>((resolve) => {
setTimeout(() => resolve({ value: undefined, done: true }), Math.max(1, deadline - Date.now()));
});

const result = await Promise.race([this.reader.read(), timeoutPromise]);

if (result.done) {
break; // Stream closed or Timeout
}

if (result.value) {
chunks = concatUint8(chunks, result.value);
}
}

return chunks;
}
}

export class PacketHandler {
constructor(private readonly protocolVersion: number) {}

async read2ByteTxRx(portHandler: PortHandler, id: number, address: number): Promise<[number, number, number]> {
if (this.protocolVersion !== 2.0) {
throw new Error(`Unsupported protocol version: ${this.protocolVersion}`);
}

const params = Uint8Array.from([address & 0xff, (address >> 8) & 0xff, 2, 0]);

const txPacket = this.buildInstructionPacket(id, DXL_INSTRUCTION_READ, params);
await portHandler.write(txPacket);

const rxPacket = await this.readStatusPacket(portHandler, id);
const parsed = this.parseStatusPacket(rxPacket);

if (parsed.params.length < 2) {
return [0, 1, 1];
}

const modelNum = parsed.params[0] | (parsed.params[1] << 8);
return [modelNum, 0, parsed.error];
}

private buildInstructionPacket(id: number, instruction: number, params: Uint8Array): Uint8Array {
const length = params.length + 3;
const packetBytes: number[] = [];
for (let i = 0; i < HEADER.length; i += 1) {
packetBytes.push(HEADER[i]);
}
packetBytes.push(id & 0xff, length & 0xff, (length >> 8) & 0xff, instruction & 0xff);
for (let i = 0; i < params.length; i += 1) {
packetBytes.push(params[i]);
}

const packetNoCrc = Uint8Array.from(packetBytes);
const crc = calcCrc(packetNoCrc);

const fullPacketBytes: number[] = [];
for (let i = 0; i < packetNoCrc.length; i += 1) {
fullPacketBytes.push(packetNoCrc[i]);
}
fullPacketBytes.push(crc & 0xff, (crc >> 8) & 0xff);
return Uint8Array.from(fullPacketBytes);
}

private async readStatusPacket(portHandler: PortHandler, expectedId: number): Promise<Uint8Array> {
const deadline = Date.now() + 750;
let buffer = new Uint8Array(0);

while (Date.now() < deadline) {
const incoming = await portHandler.readAtLeast(1, 80);
if (incoming.length === 0) {
continue;
}

buffer = concatUint8(buffer, incoming);

for (let i = 0; i <= buffer.length - 7; i += 1) {
if (!hasHeaderAt(buffer, i)) {
continue;
}

const id = buffer[i + 4];
const length = buffer[i + 5] | (buffer[i + 6] << 8);
const packetSize = 7 + length;

if (buffer.length < i + packetSize) {
continue; // need more data
}

const packet = buffer.slice(i, i + packetSize);
if (id !== expectedId) {
buffer = buffer.slice(i + packetSize);
break; // mismatch, start over from what's left
}

return packet;
}

if (buffer.length > 1024) {
buffer = buffer.slice(buffer.length - 256);
}
}

throw new Error('Timed out waiting for status packet');
}

private parseStatusPacket(packet: Uint8Array): { error: number; params: Uint8Array } {
if (packet.length < 11) {
throw new Error('Packet is too short');
}

const length = packet[5] | (packet[6] << 8);
const instruction = packet[7];
if (instruction !== DXL_STATUS) {
throw new Error(`Unexpected packet type: 0x${instruction.toString(16)}`);
}

const expectedPacketSize = 7 + length;
if (packet.length !== expectedPacketSize) {
throw new Error('Malformed packet length');
}

const expectedCrc = packet[packet.length - 2] | (packet[packet.length - 1] << 8);
const actualCrc = calcCrc(packet.slice(0, packet.length - 2));
if (expectedCrc !== actualCrc) {
throw new Error('CRC mismatch');
}

const error = packet[8];
const paramsStart = 9;
const paramsEnd = packet.length - 2;
const params = packet.slice(paramsStart, paramsEnd);
return { error, params };
}
}

/**
 * Convenience function to detect robot using an already-requested Web Serial port.
 */
export async function detectRobotModel(port: SerialPort, baudrate = 1_000_000): Promise<number | null> {
const portHandler = new PortHandler(port);
const packetHandler = new PacketHandler(2.0);
const ADDR_MODEL_NUMBER = 0;

if (await portHandler.openPort(baudrate)) {
try {
const [modelNum] = await packetHandler.read2ByteTxRx(portHandler, 1, ADDR_MODEL_NUMBER);

if (modelNum === 1060) {
console.log('Detected: Koch 1.1 FOLLOWER Arm (XL430 Base)');
} else if (modelNum === 1190) {
console.log('Detected: Koch 1.1 LEADER Arm (XL330-M077)');
} else if (modelNum === 1200) {
console.log('Detected: FOLLOWER Component (XL330-M288)');
} else if (modelNum > 0) {
console.log(`Unknown Device (Model: ${modelNum})`);
} else {
console.log('No valid model number received.');
}
return modelNum > 0 ? modelNum : null;
} catch (error) {
console.error('Error reading model number:', error);
return null;
} finally {
await portHandler.closePort();
}
} else {
console.log('Failed to open port');
return null;
}
}
