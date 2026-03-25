import { RobotConfig } from './config.js';
import type { CalibrationResults } from '../types/calibration.js';
import type { MotorCommunicationPort } from '../utils/motor-communication.js';

export interface CalibrationStep {
  name: string;
  description: string;
  promptUser: boolean;
}

export abstract class Robot {
  public config: RobotConfig;
  public name: string;
  protected port?: MotorCommunicationPort;

  constructor(config: RobotConfig) {
    this.config = config;
    this.name = config.type;
  }

  abstract connect(calibrate?: boolean): Promise<void>;
  abstract disconnect(): Promise<void>;

  abstract getCalibrationSteps(): CalibrationStep[];

  /**
   * Proceeds the user through each step.
   * `waitForConfirm` should be a function that promises to resolve when the user has confirmed the step.
   */
  abstract calibrate(waitForConfirm: (stepIndex: number, step: CalibrationStep) => Promise<void>): Promise<CalibrationResults>;
}
