import { RobotDetector, Connection } from './types';
import { KochFollowerDetector } from './detectors/KochFollowerDetector';
import { KochLeaderDetector } from './detectors/KochLeaderDetector';
import { UnknownDetector } from './detectors/index';

// Robots and teleoperators from database seeds that support "Real" modality
const KNOWN_REAL_DEVICES = [
  'aloha_gripper',
  'bi_openarm_follower',
  'bi_so_follower',
  'earthrover_mini_plus',
  'hope_jr',
  'koch_follower',
  'lekiwi',
  'omx_follower',
  'reachy2',
  'phone',           // Depending on modality setup
  'omx_leader',
  'so101_leader',
  'so100_leader',
  'homunculus_glove',
  'homunculus_arm',
  'koch_leader',
  'reachy2_teleoperator',
  'bi_so100_leader',
];

export class RobotDetectorManager {
  private detectors: RobotDetector[] = [];

  constructor() {
    this.registerDefaultDetectors();
  }

  registerDetector(detector: RobotDetector) {
    this.detectors.push(detector);
  }

  private registerDefaultDetectors() {
    // Add specific implemented detectors
    this.registerDetector(new KochFollowerDetector());
    this.registerDetector(new KochLeaderDetector());

    // Register placeholder detectors for other real devices
    for (const deviceName of KNOWN_REAL_DEVICES) {
      if (!this.detectors.find(d => d.name === deviceName)) {
        this.registerDetector(new UnknownDetector(deviceName));
      }
    }
  }

  /**
   * Tries all registered detectors, grouped by baud rate so the connection
   * is opened once per rate instead of per-detector.  This prevents the
   * rapid close→reopen cycle that the Web Serial API cannot handle.
   */
  async detect(connection: Connection): Promise<string | null> {
    const baudGroups = new Map<number, RobotDetector[]>();
    const noBaudDetectors: RobotDetector[] = [];

    for (const d of this.detectors) {
      if (d.baudRate != null) {
        let group = baudGroups.get(d.baudRate);
        if (!group) { group = []; baudGroups.set(d.baudRate, group); }
        group.push(d);
      } else {
        noBaudDetectors.push(d);
      }
    }

    // Try each baud-rate group: open once, run all matching detectors, close once
    for (const [baudRate, detectors] of baudGroups) {
      const opened = await connection.open(baudRate);
      if (!opened) continue;

      try {
        for (const detector of detectors) {
          const match = await detector.detect(connection);
          if (match) return match;
        }
      } finally {
        await connection.close();
      }
    }

    // Detectors without a baud rate (e.g. placeholder UnknownDetector)
    for (const detector of noBaudDetectors) {
      const match = await detector.detect(connection);
      if (match) return match;
    }

    return null;
  }
}
