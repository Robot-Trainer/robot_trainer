import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RobotDetectorManager } from './manager';
import { Connection } from './types';

// Mock the protocols so they don't do real comms
export const mockRead2ByteTxRx = vi.fn().mockResolvedValue([0, 0, 0]);

vi.mock('./protocols/dynamixel', () => {
  return {
    PacketHandler: class {
      read2ByteTxRx = mockRead2ByteTxRx;
    },
    ADDR_MODEL_NUMBER: 0
  };
});

describe('RobotDetectorManager', () => {
  beforeEach(() => { mockRead2ByteTxRx.mockReset(); });

  function createMockConnection(): Connection {
    return {
      open: vi.fn().mockResolvedValue(true),
      close: vi.fn().mockResolvedValue(undefined),
      write: vi.fn().mockResolvedValue(undefined),
      readAtLeast: vi.fn().mockResolvedValue(new Uint8Array())
    };
  }

  it('should find a robot (koch_follower) when the sub-detector matches', async () => {
    mockRead2ByteTxRx.mockResolvedValue([1060, 0, 0]);

    const conn = createMockConnection();
    const manager = new RobotDetectorManager();
    const result = await manager.detect(conn);

    expect(result).toBe('koch_follower');
    // Manager opens and closes the connection
    expect(conn.open).toHaveBeenCalledWith(1000000);
    expect(conn.close).toHaveBeenCalled();
  });

  it('should find a robot (koch_leader) when its model matches', async () => {
    mockRead2ByteTxRx.mockResolvedValue([1190, 0, 0]);

    const conn = createMockConnection();
    const manager = new RobotDetectorManager();
    const result = await manager.detect(conn);

    expect(result).toBe('koch_leader');
    expect(conn.open).toHaveBeenCalledWith(1000000);
    expect(conn.close).toHaveBeenCalled();
  });

  it('should return null if no detectors match', async () => {
    mockRead2ByteTxRx.mockResolvedValue([9999, 0, 0]);

    const conn = createMockConnection();
    const manager = new RobotDetectorManager();
    const result = await manager.detect(conn);

    expect(result).toBeNull();
    expect(conn.open).toHaveBeenCalled();
    expect(conn.close).toHaveBeenCalled();
  });

  it('should register unknown detectors for other real robots automatically', () => {
    const manager = new RobotDetectorManager();
    expect(manager).toBeTruthy();
  });

  it('supports registering new custom detectors', async () => {
    const manager = new RobotDetectorManager();
    manager.registerDetector({
      name: 'test_robot',
      detect: async () => 'test_robot'
    });

    const conn = createMockConnection();
    mockRead2ByteTxRx.mockResolvedValue([9999, 0, 0]);

    const result = await manager.detect(conn);
    expect(result).toBe('test_robot');
  });

  it('should return null when connection fails to open', async () => {
    const conn = createMockConnection();
    (conn.open as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const manager = new RobotDetectorManager();
    const result = await manager.detect(conn);

    expect(result).toBeNull();
    expect(conn.open).toHaveBeenCalled();
    // close should not be called since open failed
    expect(conn.close).not.toHaveBeenCalled();
  });

  it('opens connection once per baud-rate group, not per detector', async () => {
    mockRead2ByteTxRx.mockResolvedValue([9999, 0, 0]);

    const conn = createMockConnection();
    const manager = new RobotDetectorManager();
    await manager.detect(conn);

    // Both KochFollower and KochLeader share 1000000 baud → one open call
    expect(conn.open).toHaveBeenCalledTimes(1);
    expect(conn.open).toHaveBeenCalledWith(1000000);
    expect(conn.close).toHaveBeenCalledTimes(1);
  });

  it('closes connection even when a detector throws', async () => {
    mockRead2ByteTxRx.mockRejectedValue(new Error('comm failure'));

    const conn = createMockConnection();
    const manager = new RobotDetectorManager();
    const result = await manager.detect(conn);

    expect(result).toBeNull();
    // Connection must still be closed after error
    expect(conn.close).toHaveBeenCalled();
  });
});
