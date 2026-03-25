import { describe, it, expect, vi } from 'vitest';
import { KochFollowerConfig, KochFollower } from './koch_follower.js';

describe('KochFollower', () => {
    it('should initialize correctly', () => {
        const config = new KochFollowerConfig();
        expect(config.type).toBe('koch_follower');
        
        const robotInstance = new KochFollower(config);
        expect(robotInstance.name).toBe('koch_follower');
    });

    it('should connect and disconnect', async () => {
        const config = new KochFollowerConfig();
        const robotInstance = new KochFollower(config);
        await expect(robotInstance.connect()).resolves.toBeUndefined();
        await expect(robotInstance.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const config = new KochFollowerConfig();
        const robotInstance = new KochFollower(config);
        const steps = robotInstance.getCalibrationSteps();
        expect(steps.length).toBeGreaterThan(0);
        expect(steps[0].name).toBe('Neutral Position');
        
        const waitForConfirm = vi.fn().mockResolvedValue(undefined);
        const results = await robotInstance.calibrate(waitForConfirm);
        
        expect(results).toBeDefined();
        // Since promptUser is true on two steps (0 and 2)
        expect(waitForConfirm).toHaveBeenCalledTimes(2);
    });
});
