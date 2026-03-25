import { describe, it, expect, vi } from 'vitest';
import { OpenarmFollowerConfig, OpenarmFollower } from './openarm_follower.js';

describe('OpenarmFollower', () => {
    it('should initialize correctly', () => {
        const config = new OpenarmFollowerConfig();
        expect(config.type).toBe('openarm_follower');
        
        const robotInstance = new OpenarmFollower(config);
        expect(robotInstance.name).toBe('openarm_follower');
    });

    it('should connect and disconnect', async () => {
        const config = new OpenarmFollowerConfig();
        const robotInstance = new OpenarmFollower(config);
        await expect(robotInstance.connect()).resolves.toBeUndefined();
        await expect(robotInstance.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const config = new OpenarmFollowerConfig();
        const robotInstance = new OpenarmFollower(config);
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
