export * from './DynamixelDetector';
export * from './KochFollowerDetector';
export * from './KochLeaderDetector';

import { RobotDetector } from '../types';

export class UnknownDetector implements RobotDetector {
  constructor(public readonly name: string) {}

  async detect(): Promise<string | null> {
    // We don't have enough information to detect this robot yet
    return null;
  }
}
