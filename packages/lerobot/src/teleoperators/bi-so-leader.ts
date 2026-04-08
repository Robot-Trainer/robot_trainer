import { TeleoperatorConfig } from './config.js';
import { Teleoperator } from './teleoperator.js';
import { SoLeaderConfig, SoLeader } from './so-leader.js';
import type { CalibrationStep } from '../robots/robot.js';
import type { CalibrationResults } from '../types/calibration.js';

export class BiSoLeaderConfig extends TeleoperatorConfig {
  public leftArmConfig: SoLeaderConfig;
  public rightArmConfig: SoLeaderConfig;

  constructor(leftArmConfig: SoLeaderConfig, rightArmConfig: SoLeaderConfig, id?: string, calibrationDir?: string) {
    super(id, calibrationDir);
    this.leftArmConfig = leftArmConfig;
    this.rightArmConfig = rightArmConfig;
  }

  get type(): string {
    return "bi_so_leader";
  }
}

export class BiSoLeader extends Teleoperator {
  public leftArm: SoLeader;
  public rightArm: SoLeader;

  constructor(config: BiSoLeaderConfig) {
    super(config);
    this.leftArm = new SoLeader(config.leftArmConfig);
    this.rightArm = new SoLeader(config.rightArmConfig);
  }

  async connect(calibrate?: boolean): Promise<void> {
    await this.leftArm.connect(calibrate);
    await this.rightArm.connect(calibrate);
  }

  async disconnect(): Promise<void> {
    await this.leftArm.disconnect();
    await this.rightArm.disconnect();
  }

  getCalibrationSteps(): CalibrationStep[] {
    return [
      { name: "Neutral Position", description: "Move both leader arms to the middle of their range of motion.", promptUser: true },
      { name: "Save Homing Offsets", description: "Confirm to save the current positions as neutral.", promptUser: false },
      { name: "Rotate Joints", description: "Rotate each joint on both arms to its maximum position in either direction.", promptUser: true },
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
    const leftAction = await this.leftArm.getAction();
    const rightAction = await this.rightArm.getAction();
    const merged: Record<string, number> = {};
    for (const [key, value] of Object.entries(leftAction)) {
      merged[`left_${key}`] = value;
    }
    for (const [key, value] of Object.entries(rightAction)) {
      merged[`right_${key}`] = value;
    }
    return merged;
  }

  async sendFeedback(_feedback: Record<string, unknown>): Promise<void> {
    throw new Error("BiSoLeader does not support feedback");
  }
}
