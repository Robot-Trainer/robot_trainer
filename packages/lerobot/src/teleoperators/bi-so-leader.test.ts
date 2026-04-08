import { describe, it, expect, vi } from 'vitest';
import { BiSoLeaderConfig, BiSoLeader } from './bi-so-leader.js';
import { SoLeaderConfig } from './so-leader.js';

describe('BiSoLeader', () => {
    it('should initialize correctly', () => {
        const leftConfig = new SoLeaderConfig('/dev/ttyUSB0', 'left');
        const rightConfig = new SoLeaderConfig('/dev/ttyUSB1', 'right');
        const config = new BiSoLeaderConfig(leftConfig, rightConfig, 'bi_so');
        expect(config.type).toBe('bi_so_leader');

        const teleop = new BiSoLeader(config);
        expect(teleop.name).toBe('bi_so_leader');
        expect(teleop.leftArm).toBeDefined();
        expect(teleop.rightArm).toBeDefined();
    });

    it('should connect and disconnect both arms', async () => {
        const leftConfig = new SoLeaderConfig('/dev/ttyUSB0', 'left');
        const rightConfig = new SoLeaderConfig('/dev/ttyUSB1', 'right');
        const config = new BiSoLeaderConfig(leftConfig, rightConfig);
        const teleop = new BiSoLeader(config);
        await expect(teleop.connect()).resolves.toBeUndefined();
        await expect(teleop.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const leftConfig = new SoLeaderConfig('/dev/ttyUSB0', 'left');
        const rightConfig = new SoLeaderConfig('/dev/ttyUSB1', 'right');
        const config = new BiSoLeaderConfig(leftConfig, rightConfig);
        const teleop = new BiSoLeader(config);
        const steps = teleop.getCalibrationSteps();
        expect(steps.length).toBeGreaterThan(0);
        expect(steps[0].name).toBe('Neutral Position');

        const waitForConfirm = vi.fn().mockResolvedValue(undefined);
        const results = await teleop.calibrate(waitForConfirm);

        expect(results).toBeDefined();
        expect(waitForConfirm).toHaveBeenCalledTimes(2);
    });

    it('should merge left and right actions', async () => {
        const leftConfig = new SoLeaderConfig('/dev/ttyUSB0', 'left');
        const rightConfig = new SoLeaderConfig('/dev/ttyUSB1', 'right');
        const config = new BiSoLeaderConfig(leftConfig, rightConfig);
        const teleop = new BiSoLeader(config);
        const action = await teleop.getAction();
        expect(action).toEqual({});
    });

    it('should throw on sendFeedback', async () => {
        const leftConfig = new SoLeaderConfig('/dev/ttyUSB0', 'left');
        const rightConfig = new SoLeaderConfig('/dev/ttyUSB1', 'right');
        const config = new BiSoLeaderConfig(leftConfig, rightConfig);
        const teleop = new BiSoLeader(config);
        await expect(teleop.sendFeedback({})).rejects.toThrow('BiSoLeader does not support feedback');
    });
});
