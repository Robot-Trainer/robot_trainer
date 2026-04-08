import { TeleoperatorConfig } from './config.js';
import { Teleoperator } from './teleoperator.js';
import type { CalibrationStep } from '../robots/robot.js';
import type { CalibrationResults } from '../types/calibration.js';

export class SoLeaderConfig extends TeleoperatorConfig {
  public port: string;

  constructor(port: string, id?: string, calibrationDir?: string) {
    super(id, calibrationDir);
    this.port = port;
  }

  get type(): string {
    return "so_leader";
  }
}

export class SoLeader extends Teleoperator {
  constructor(config: SoLeaderConfig) {
    super(config);
  }

  async connect(_calibrate?: boolean): Promise<void> {
    // Implementation specific to so_leader
  }

  async disconnect(): Promise<void> {
    // Implementation specific to so_leader
  }

  getCalibrationSteps(): CalibrationStep[] {
    return [
      { name: "Neutral Position", description: "Move the leader arm to the middle of its range of motion.", promptUser: true },
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
    return {};
  }

  async getAction(): Promise<Record<string, number>> {
    // Read present position from all motors
    return {};
  }

  async sendFeedback(_feedback: Record<string, unknown>): Promise<void> {
    throw new Error("SoLeader does not support feedback");
  }
}

/** Alias matching Python SO100Leader */
export const SO100Leader = SoLeader;
export type SO100Leader = SoLeader;
export const SO100LeaderConfig = SoLeaderConfig;
export type SO100LeaderConfig = SoLeaderConfig;

/** Alias matching Python SO101Leader */
export const SO101Leader = SoLeader;
export type SO101Leader = SoLeader;
export const SO101LeaderConfig = SoLeaderConfig;
export type SO101LeaderConfig = SoLeaderConfig;
