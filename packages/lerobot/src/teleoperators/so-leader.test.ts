import { describe, it, expect, vi } from 'vitest';
import { SoLeaderConfig, SoLeader, SO100Leader, SO101Leader } from './so-leader.js';

describe('SoLeader', () => {
    it('should initialize correctly', () => {
        const config = new SoLeaderConfig('/dev/ttyUSB0');
        expect(config.type).toBe('so_leader');
        expect(config.port).toBe('/dev/ttyUSB0');

        const teleop = new SoLeader(config);
        expect(teleop.name).toBe('so_leader');
    });

    it('should connect and disconnect', async () => {
        const config = new SoLeaderConfig('/dev/ttyUSB0');
        const teleop = new SoLeader(config);
        await expect(teleop.connect()).resolves.toBeUndefined();
        await expect(teleop.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const config = new SoLeaderConfig('/dev/ttyUSB0');
        const teleop = new SoLeader(config);
        const steps = teleop.getCalibrationSteps();
        expect(steps.length).toBeGreaterThan(0);
        expect(steps[0].name).toBe('Neutral Position');

        const waitForConfirm = vi.fn().mockResolvedValue(undefined);
        const results = await teleop.calibrate(waitForConfirm);

        expect(results).toBeDefined();
        expect(waitForConfirm).toHaveBeenCalledTimes(2);
    });

    it('should return empty action', async () => {
        const config = new SoLeaderConfig('/dev/ttyUSB0');
        const teleop = new SoLeader(config);
        const action = await teleop.getAction();
        expect(action).toEqual({});
    });

    it('should throw on sendFeedback', async () => {
        const config = new SoLeaderConfig('/dev/ttyUSB0');
        const teleop = new SoLeader(config);
        await expect(teleop.sendFeedback({})).rejects.toThrow('SoLeader does not support feedback');
    });

    it('should have SO100Leader and SO101Leader aliases', () => {
        expect(SO100Leader).toBe(SoLeader);
        expect(SO101Leader).toBe(SoLeader);
    });
});
