import { describe, it, expect, vi } from 'vitest';
import { OmxFollowerConfig, OmxFollower } from './omx_follower.js';

describe('OmxFollower', () => {
    it('should initialize correctly', () => {
        const config = new OmxFollowerConfig();
        expect(config.type).toBe('omx_follower');
        
        const robotInstance = new OmxFollower(config);
        expect(robotInstance.name).toBe('omx_follower');
    });

    it('should connect and disconnect', async () => {
        const config = new OmxFollowerConfig();
        const robotInstance = new OmxFollower(config);
        await expect(robotInstance.connect()).resolves.toBeUndefined();
        await expect(robotInstance.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const config = new OmxFollowerConfig();
        const robotInstance = new OmxFollower(config);
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
