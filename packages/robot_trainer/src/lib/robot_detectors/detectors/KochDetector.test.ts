import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KochFollowerDetector } from './KochFollowerDetector';
import { KochLeaderDetector } from './KochLeaderDetector';
import { Connection } from '../types';

export const mockRead2ByteTxRx = vi.fn().mockResolvedValue([0, 0, 0]);

vi.mock('../protocols/dynamixel', () => {
  return {
    PacketHandler: class {
      read2ByteTxRx = mockRead2ByteTxRx;
    },
    ADDR_MODEL_NUMBER: 0
  };
});

describe('Koch Detectors', () => {
  beforeEach(() => { mockRead2ByteTxRx.mockReset(); });

  function createMockConnection(openSuccess = true): Connection {
    return {
      open: vi.fn().mockResolvedValue(openSuccess),
      close: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
      readAtLeast: vi.fn().mockResolvedValue(new Uint8Array())
    };
  }

  it('KochFollowerDetector detects follower robots properly (1060)', async () => {
    mockRead2ByteTxRx.mockResolvedValue([1060, 0, 0]);

    const conn = createMockConnection();
    const detector = new KochFollowerDetector();

    const result = await detector.detect(conn);
    expect(result).toBe('koch_follower');
    expect(conn.open).toHaveBeenCalledWith(1000000);
    expect(conn.close).toHaveBeenCalled();
  });

  it('KochFollowerDetector detects follower robots properly (1200)', async () => {
    mockRead2ByteTxRx.mockResolvedValue([1200, 0, 0]);

    const conn = createMockConnection();
    const detector = new KochFollowerDetector();

    const result = await detector.detect(conn);
    expect(result).toBe('koch_follower');
  });

  it('KochFollowerDetector ignores unrecognized model numbers', async () => {
    mockRead2ByteTxRx.mockResolvedValue([9999, 0, 0]);

    const conn = createMockConnection();
    const detector = new KochFollowerDetector();

    const result = await detector.detect(conn);
    expect(result).toBeNull();
  });

  it('KochFollowerDetector returns null on open failure', async () => {
    const conn = createMockConnection(false);
    const detector = new KochFollowerDetector();

    const result = await detector.detect(conn);
    expect(result).toBeNull();
  });

  it('KochLeaderDetector detects leader robots properly', async () => {
    mockRead2ByteTxRx.mockResolvedValue([1190, 0, 0]);

    const conn = createMockConnection();
    const detector = new KochLeaderDetector();

    const result = await detector.detect(conn);
    expect(result).toBe('koch_leader');
  });

});
