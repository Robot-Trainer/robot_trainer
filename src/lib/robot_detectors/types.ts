export interface Connection {
  open(baudRate?: number): Promise<boolean>;
  close(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  readAtLeast(minBytes: number, timeoutMs?: number): Promise<Uint8Array>;
}

export interface RobotDetector {
  /**
   * Attempts to detect a specific robot or teleoperator using the provided connection.
   * Returns a string representing the robot model or identifier (e.g. 'koch_follower'),
   * or null if this detector could not identify the device.
   */
  detect(connection: Connection): Promise<string | null>;
}
