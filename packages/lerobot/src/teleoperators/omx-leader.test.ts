import { describe, it, expect, vi } from 'vitest';
import { OmxLeaderConfig, OmxLeader } from './omx-leader.js';

describe('OmxLeader', () => {
    it('should initialize correctly', () => {
        const config = new OmxLeaderConfig('/dev/ttyUSB0');
        expect(config.type).toBe('omx_leader');
        expect(config.port).toBe('/dev/ttyUSB0');

        const teleop = new OmxLeader(config);
        expect(teleop.name).toBe('omx_leader');
    });

    it('should connect and disconnect', async () => {
        const config = new OmxLeaderConfig('/dev/ttyUSB0');
        const teleop = new OmxLeader(config);
        await expect(teleop.connect()).resolves.toBeUndefined();
        await expect(teleop.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const config = new OmxLeaderConfig('/dev/ttyUSB0');
        const teleop = new OmxLeader(config);
        const steps = teleop.getCalibrationSteps();
        expect(steps.length).toBeGreaterThan(0);
        expect(steps[0].name).toBe('Neutral Position');

        const waitForConfirm = vi.fn().mockResolvedValue(undefined);
        const results = await teleop.calibrate(waitForConfirm);

        expect(results).toBeDefined();
        expect(waitForConfirm).toHaveBeenCalledTimes(2);
    });

    it('should return empty action', async () => {
        const config = new OmxLeaderConfig('/dev/ttyUSB0');
        const teleop = new OmxLeader(config);
        const action = await teleop.getAction();
        expect(action).toEqual({});
    });

    it('should throw on sendFeedback', async () => {
        const config = new OmxLeaderConfig('/dev/ttyUSB0');
        const teleop = new OmxLeader(config);
        await expect(teleop.sendFeedback({})).rejects.toThrow('OmxLeader does not support feedback');
    });
});
