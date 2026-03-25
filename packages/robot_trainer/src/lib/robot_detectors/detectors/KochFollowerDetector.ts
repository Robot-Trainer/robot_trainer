import { DynamixelDetector } from './DynamixelDetector';

export class KochFollowerDetector extends DynamixelDetector {
  readonly name = 'koch_follower';
  readonly baudRate = 1000000;
  readonly protocolVersion = 2.0;

  // 1060 = XL430-W250
  // 1200 = XL330-M288
  readonly expectedModelNumbers = [1060, 1200];
}
