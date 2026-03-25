import { describe, it, expect, vi } from 'vitest';
import { LekiwiConfig, Lekiwi } from './lekiwi.js';

describe('Lekiwi', () => {
    it('should initialize correctly', () => {
        const config = new LekiwiConfig();
        expect(config.type).toBe('lekiwi');
        
        const robotInstance = new Lekiwi(config);
        expect(robotInstance.name).toBe('lekiwi');
    });

    it('should connect and disconnect', async () => {
        const config = new LekiwiConfig();
        const robotInstance = new Lekiwi(config);
        await expect(robotInstance.connect()).resolves.toBeUndefined();
        await expect(robotInstance.disconnect()).resolves.toBeUndefined();
    });

    it('should yield calibration steps properly', async () => {
        const config = new LekiwiConfig();
        const robotInstance = new Lekiwi(config);
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
