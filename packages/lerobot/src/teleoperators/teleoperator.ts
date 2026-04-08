import { TeleoperatorConfig } from './config.js';
import type { CalibrationStep } from '../robots/robot.js';
import type { CalibrationResults } from '../types/calibration.js';

export abstract class Teleoperator {
  public config: TeleoperatorConfig;
  public name: string;

  constructor(config: TeleoperatorConfig) {
    this.config = config;
    this.name = config.type;
  }

  abstract connect(calibrate?: boolean): Promise<void>;
  abstract disconnect(): Promise<void>;

  abstract getCalibrationSteps(): CalibrationStep[];

  abstract calibrate(waitForConfirm: (stepIndex: number, step: CalibrationStep) => Promise<void>): Promise<CalibrationResults>;

  abstract getAction(): Promise<Record<string, number>>;
  abstract sendFeedback(feedback: Record<string, unknown>): Promise<void>;
}
