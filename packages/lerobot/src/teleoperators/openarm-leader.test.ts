import { describe, it, expect, vi } from 'vitest';
import { OpenarmLeaderConfig, OpenarmLeader } from './openarm-leader.js';

describe('OpenarmLeader', () => {
    it('should initialize correctly', () => {
        const config = new OpenarmLeaderConfig('can0');
        expect(config.type).toBe('openarm_leader');
        expect(config.port).toBe('can0');

        const teleop = new OpenarmLeader(config);
        expect(teleop.name).toBe('openarm_leader');
    });

    it('should connect and disconnect', async () => {
        const config = new OpenarmLeaderConfig('can0');
        const teleop = new OpenarmLeader(config);
        await expect(teleop.connect()).resolves.toBeUndefined();
        await expect(teleop.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const config = new OpenarmLeaderConfig('can0');
        const teleop = new OpenarmLeader(config);
        const steps = teleop.getCalibrationSteps();
        expect(steps.length).toBeGreaterThan(0);
        expect(steps[0].name).toBe('Zero Position');

        const waitForConfirm = vi.fn().mockResolvedValue(undefined);
        const results = await teleop.calibrate(waitForConfirm);

        expect(results).toBeDefined();
        expect(waitForConfirm).toHaveBeenCalledTimes(2);
    });

    it('should return empty action', async () => {
        const config = new OpenarmLeaderConfig('can0');
        const teleop = new OpenarmLeader(config);
        const action = await teleop.getAction();
        expect(action).toEqual({});
    });

    it('should throw on sendFeedback', async () => {
        const config = new OpenarmLeaderConfig('can0');
        const teleop = new OpenarmLeader(config);
        await expect(teleop.sendFeedback({})).rejects.toThrow('OpenarmLeader does not support feedback');
    });
});
