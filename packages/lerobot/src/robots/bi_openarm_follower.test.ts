import { describe, it, expect, vi } from 'vitest';
import { BiOpenarmFollowerConfig, BiOpenarmFollower } from './bi_openarm_follower.js';

describe('BiOpenarmFollower', () => {
    it('should initialize correctly', () => {
        const config = new BiOpenarmFollowerConfig();
        expect(config.type).toBe('bi_openarm_follower');
        
        const robotInstance = new BiOpenarmFollower(config);
        expect(robotInstance.name).toBe('bi_openarm_follower');
    });

    it('should connect and disconnect', async () => {
        const config = new BiOpenarmFollowerConfig();
        const robotInstance = new BiOpenarmFollower(config);
        await expect(robotInstance.connect()).resolves.toBeUndefined();
        await expect(robotInstance.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const config = new BiOpenarmFollowerConfig();
        const robotInstance = new BiOpenarmFollower(config);
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
