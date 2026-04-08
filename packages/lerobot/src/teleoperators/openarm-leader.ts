import { TeleoperatorConfig } from './config.js';
import { Teleoperator } from './teleoperator.js';
import type { CalibrationStep } from '../robots/robot.js';
import type { CalibrationResults } from '../types/calibration.js';

export class OpenarmLeaderConfig extends TeleoperatorConfig {
  public port: string;

  constructor(port: string, id?: string, calibrationDir?: string) {
    super(id, calibrationDir);
    this.port = port;
  }

  get type(): string {
    return "openarm_leader";
  }
}

export class OpenarmLeader extends Teleoperator {
  constructor(config: OpenarmLeaderConfig) {
    super(config);
  }

  async connect(_calibrate?: boolean): Promise<void> {
    // Implementation specific to openarm_leader
  }

  async disconnect(): Promise<void> {
    // Implementation specific to openarm_leader
  }

  getCalibrationSteps(): CalibrationStep[] {
    return [
      { name: "Zero Position", description: "Set the arm to its zero position (hanging down, gripper closed).", promptUser: true },
      { name: "Save Homing Offsets", description: "Confirm to save the current position as zero.", promptUser: false },
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
    return {};
  }

  async getAction(): Promise<Record<string, number>> {
    // Read position, velocity, torque from all motors
    return {};
  }

  async sendFeedback(_feedback: Record<string, unknown>): Promise<void> {
    throw new Error("OpenarmLeader does not support feedback");
  }
}
