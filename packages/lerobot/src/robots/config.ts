export abstract class RobotConfig {
  public id?: string;
  public calibrationDir?: string;

  constructor(id?: string, calibrationDir?: string) {
    this.id = id;
    this.calibrationDir = calibrationDir;
  }

  abstract get type(): string;
}
