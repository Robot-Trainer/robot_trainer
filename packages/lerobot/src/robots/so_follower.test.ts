import { describe, it, expect, vi } from 'vitest';
import { SoFollowerConfig, SoFollower } from './so_follower.js';

describe('SoFollower', () => {
    it('should initialize correctly', () => {
        const config = new SoFollowerConfig();
        expect(config.type).toBe('so_follower');
        
        const robotInstance = new SoFollower(config);
        expect(robotInstance.name).toBe('so_follower');
    });

    it('should connect and disconnect', async () => {
        const config = new SoFollowerConfig();
        const robotInstance = new SoFollower(config);
        await expect(robotInstance.connect()).resolves.toBeUndefined();
        await expect(robotInstance.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const config = new SoFollowerConfig();
        const robotInstance = new SoFollower(config);
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
