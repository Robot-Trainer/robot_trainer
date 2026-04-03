export type { Connection } from '@robot-trainer/serial';
import type { Connection } from '@robot-trainer/serial';

export interface RobotDetector {
  /** Human-readable identifier matching the seed dirName (e.g. 'koch_follower'). */
  readonly name: string;

  /** Baud rate this detector needs the connection opened at. */
  readonly baudRate?: number;

  /**
   * Attempts to detect a specific robot or teleoperator using the provided connection.
   * The connection is already open at the correct baud rate when this is called
   * from RobotDetectorManager; standalone callers should open first.
   * Returns a string representing the robot model or identifier (e.g. 'koch_follower'),
   * or null if this detector could not identify the device.
   */
  detect(connection: Connection): Promise<string | null>;
}
