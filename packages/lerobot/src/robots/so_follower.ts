import { RobotConfig } from './config.js';
import { Robot, CalibrationStep } from './robot.js';
import type { CalibrationResults } from '../types/calibration.js';

export class SoFollowerConfig extends RobotConfig {
  get type(): string {
    return "so_follower";
  }
}

export class SoFollower extends Robot {
  constructor(config: SoFollowerConfig) {
    super(config);
  }

  async connect(_calibrate?: boolean): Promise<void> {
    // Implementation specific to so_follower
  }

  async disconnect(): Promise<void> {
    // Implementation specific to so_follower
  }

  getCalibrationSteps(): CalibrationStep[] {
    return [
      { name: "Neutral Position", description: "Set the robot to its neutral position.", promptUser: true },
      { name: "Save Homing Offsets", description: "Confirm to save the current position as neutral.", promptUser: false },
      { name: "Rotate Joints", description: "Rotate each joint to its maximum position in either direction.", promptUser: true },
      { name: "Finish", description: "Confirm that you are finished.", promptUser: false }
    ];
  }

  async calibrate(waitForConfirm: (stepIndex: number, step: CalibrationStep) => Promise<void>): Promise<CalibrationResults> {
    const steps = this.getCalibrationSteps();
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].promptUser) {
            await waitForConfirm(i, steps[i]);
        }
    }
    // Mock return
    return {};
  }
}
