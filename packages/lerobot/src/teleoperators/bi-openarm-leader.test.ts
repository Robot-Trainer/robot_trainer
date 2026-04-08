import { describe, it, expect, vi } from 'vitest';
import { BiOpenarmLeaderConfig, BiOpenarmLeader } from './bi-openarm-leader.js';
import { OpenarmLeaderConfig } from './openarm-leader.js';

describe('BiOpenarmLeader', () => {
    it('should initialize correctly', () => {
        const leftConfig = new OpenarmLeaderConfig('can0', 'left');
        const rightConfig = new OpenarmLeaderConfig('can1', 'right');
        const config = new BiOpenarmLeaderConfig(leftConfig, rightConfig, 'bi_openarm');
        expect(config.type).toBe('bi_openarm_leader');

        const teleop = new BiOpenarmLeader(config);
        expect(teleop.name).toBe('bi_openarm_leader');
        expect(teleop.leftArm).toBeDefined();
        expect(teleop.rightArm).toBeDefined();
    });

    it('should connect and disconnect both arms', async () => {
        const leftConfig = new OpenarmLeaderConfig('can0', 'left');
        const rightConfig = new OpenarmLeaderConfig('can1', 'right');
        const config = new BiOpenarmLeaderConfig(leftConfig, rightConfig);
        const teleop = new BiOpenarmLeader(config);
        await expect(teleop.connect()).resolves.toBeUndefined();
        await expect(teleop.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const leftConfig = new OpenarmLeaderConfig('can0', 'left');
        const rightConfig = new OpenarmLeaderConfig('can1', 'right');
        const config = new BiOpenarmLeaderConfig(leftConfig, rightConfig);
        const teleop = new BiOpenarmLeader(config);
        const steps = teleop.getCalibrationSteps();
        expect(steps.length).toBeGreaterThan(0);
        expect(steps[0].name).toBe('Zero Position');

        const waitForConfirm = vi.fn().mockResolvedValue(undefined);
        const results = await teleop.calibrate(waitForConfirm);

        expect(results).toBeDefined();
        expect(waitForConfirm).toHaveBeenCalledTimes(2);
    });

    it('should merge left and right actions', async () => {
        const leftConfig = new OpenarmLeaderConfig('can0', 'left');
        const rightConfig = new OpenarmLeaderConfig('can1', 'right');
        const config = new BiOpenarmLeaderConfig(leftConfig, rightConfig);
        const teleop = new BiOpenarmLeader(config);
        const action = await teleop.getAction();
        expect(action).toEqual({});
    });

    it('should throw on sendFeedback', async () => {
        const leftConfig = new OpenarmLeaderConfig('can0', 'left');
        const rightConfig = new OpenarmLeaderConfig('can1', 'right');
        const config = new BiOpenarmLeaderConfig(leftConfig, rightConfig);
        const teleop = new BiOpenarmLeader(config);
        await expect(teleop.sendFeedback({})).rejects.toThrow('BiOpenarmLeader does not support feedback');
    });
});
