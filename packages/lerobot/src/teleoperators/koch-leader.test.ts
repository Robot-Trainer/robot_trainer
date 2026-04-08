import { describe, it, expect, vi } from 'vitest';
import { KochLeaderConfig, KochLeader } from './koch-leader.js';

describe('KochLeader', () => {
    it('should initialize correctly', () => {
        const config = new KochLeaderConfig('/dev/ttyUSB0');
        expect(config.type).toBe('koch_leader');
        expect(config.port).toBe('/dev/ttyUSB0');

        const teleop = new KochLeader(config);
        expect(teleop.name).toBe('koch_leader');
    });

    it('should connect and disconnect', async () => {
        const config = new KochLeaderConfig('/dev/ttyUSB0');
        const teleop = new KochLeader(config);
        await expect(teleop.connect()).resolves.toBeUndefined();
        await expect(teleop.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const config = new KochLeaderConfig('/dev/ttyUSB0');
        const teleop = new KochLeader(config);
        const steps = teleop.getCalibrationSteps();
        expect(steps.length).toBeGreaterThan(0);
        expect(steps[0].name).toBe('Neutral Position');

        const waitForConfirm = vi.fn().mockResolvedValue(undefined);
        const results = await teleop.calibrate(waitForConfirm);

        expect(results).toBeDefined();
        expect(waitForConfirm).toHaveBeenCalledTimes(2);
    });

    it('should return empty action', async () => {
        const config = new KochLeaderConfig('/dev/ttyUSB0');
        const teleop = new KochLeader(config);
        const action = await teleop.getAction();
        expect(action).toEqual({});
    });

    it('should throw on sendFeedback', async () => {
        const config = new KochLeaderConfig('/dev/ttyUSB0');
        const teleop = new KochLeader(config);
        await expect(teleop.sendFeedback({})).rejects.toThrow('KochLeader does not support feedback');
    });
});
