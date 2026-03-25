import { describe, it, expect, vi } from 'vitest';
import { HopeJrConfig, HopeJr } from './hope_jr.js';

describe('HopeJr', () => {
    it('should initialize correctly', () => {
        const config = new HopeJrConfig();
        expect(config.type).toBe('hope_jr');
        
        const robotInstance = new HopeJr(config);
        expect(robotInstance.name).toBe('hope_jr');
    });

    it('should connect and disconnect', async () => {
        const config = new HopeJrConfig();
        const robotInstance = new HopeJr(config);
        await expect(robotInstance.connect()).resolves.toBeUndefined();
        await expect(robotInstance.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const config = new HopeJrConfig();
        const robotInstance = new HopeJr(config);
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
