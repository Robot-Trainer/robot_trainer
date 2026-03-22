import { describe, it, expect, vi } from 'vitest';
import { calcCrc, hasHeaderAt, concatUint8, PacketHandler, ADDR_MODEL_NUMBER } from './dynamixel';
import { Connection } from '../types';

describe('Dynamixel Protocol Utils', () => {
  it('should compute valid CRC', () => {
    // Dynamixel CRC for an example ping packet
    const data = Uint8Array.from([0xff, 0xff, 0xfd, 0x00, 0x01, 0x03, 0x00, 0x01]);
    const crc = calcCrc(data);
    expect(crc).toBe(19993); // calculated crc value for this packet
  });

  it('should detect header properly', () => {
    const data = Uint8Array.from([0x00, 0xff, 0xff, 0xfd, 0x00, 0x05]);
    expect(hasHeaderAt(data, 0)).toBe(false);
    expect(hasHeaderAt(data, 1)).toBe(true);
  });

  it('should concat uint8 arrays', () => {
    const a = Uint8Array.from([1, 2]);
    const b = Uint8Array.from([3, 4]);
    const result = concatUint8(a, b);
    expect(result).toEqual(Uint8Array.from([1, 2, 3, 4]));
  });
});

describe('PacketHandler', () => {
  it('should build and parse packets via read2ByteTxRx', async () => {
    const mockConnection: Connection = {
      open: vi.fn().mockResolvedValue(true),
      close: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
      readAtLeast: vi.fn().mockImplementation(async () => {
        // Construct a mock status packet representing read success for model number 1060 (0x0424)
        // Header: FF FF FD 00
        // ID: 01
        // Length: 06 00
        // Instruction (status): 55
        // Error: 00
        // Params: 24 04
        // CRC: ...
        const builderData = Uint8Array.from([
          0xff, 0xff, 0xfd, 0x00,
          0x01,
          0x06, 0x00,
          0x55,
          0x00,
          0x24, 0x04
        ]);
        const crc = calcCrc(builderData);
        return Uint8Array.from([...builderData, crc & 0xff, (crc >> 8) & 0xff]);
      })
    };

    const handler = new PacketHandler(2.0);
    const [modelNum, _, error] = await handler.read2ByteTxRx(mockConnection, 1, ADDR_MODEL_NUMBER);

    expect(modelNum).toBe(1060);
    expect(error).toBe(0);
    expect(mockConnection.write).toHaveBeenCalled();
  });
});
