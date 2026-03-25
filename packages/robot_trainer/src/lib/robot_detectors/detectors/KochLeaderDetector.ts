import { DynamixelDetector } from './DynamixelDetector';

export class KochLeaderDetector extends DynamixelDetector {
  readonly name = 'koch_leader';
  readonly baudRate = 1000000;
  readonly protocolVersion = 2.0;

  // 1190 = XL330-M077
  readonly expectedModelNumbers = [1190];
}
