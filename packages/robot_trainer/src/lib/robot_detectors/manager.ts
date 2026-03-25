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
   * Tries all registered detectors in sequence until one is successful.
   */
  async detect(connection: Connection): Promise<string | null> {
    for (const detector of this.detectors) {
      const match = await detector.detect(connection);
      if (match) {
        return match;
      }
    }
    return null;
  }
}
