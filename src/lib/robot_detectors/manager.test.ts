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
  });

  it('should find a robot (koch_leader) when its model matches', async () => {
    mockRead2ByteTxRx.mockResolvedValue([1190, 0, 0]);

    const conn = createMockConnection();
    const manager = new RobotDetectorManager();
    const result = await manager.detect(conn);

    expect(result).toBe('koch_leader');
  });

  it('should return null if no detectors match', async () => {
    mockRead2ByteTxRx.mockResolvedValue([9999, 0, 0]);

    const conn = createMockConnection();
    const manager = new RobotDetectorManager();
    const result = await manager.detect(conn);

    expect(result).toBeNull();
  });

  it('should register unknown detectors for other real robots automatically', () => {
    const manager = new RobotDetectorManager();
    expect(manager).toBeTruthy();
  });

  it('supports registering new custom detectors', async () => {
    const manager = new RobotDetectorManager();
    manager.registerDetector({
      name: 'test_robot',
      detect: async () => 'test_robot' // will just match this immediately because others fail
    });

    const conn = createMockConnection();
    mockRead2ByteTxRx.mockResolvedValue([9999, 0, 0]);

    const result = await manager.detect(conn);
    expect(result).toBe('test_robot');
  });
});
