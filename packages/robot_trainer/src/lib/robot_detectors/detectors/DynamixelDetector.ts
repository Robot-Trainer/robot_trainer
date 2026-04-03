import { Connection, RobotDetector } from '../types';
import { PacketHandler, ADDR_MODEL_NUMBER } from '../protocols/dynamixel';

export abstract class DynamixelDetector implements RobotDetector {
  abstract readonly name: string;
  abstract readonly baudRate: number;
  abstract readonly protocolVersion: number;
  abstract readonly expectedModelNumbers: readonly number[];

  // Default motor ID to query for model number check
  protected readonly targetId: number = 1;

  async detect(connection: Connection): Promise<string | null> {
    try {
      const packetHandler = new PacketHandler(this.protocolVersion);
      const [modelNum] = await packetHandler.read2ByteTxRx(connection, this.targetId, ADDR_MODEL_NUMBER);

      if (this.expectedModelNumbers.includes(modelNum)) {
        return this.name;
      }
      return null;
    } catch (_error) {
      return null;
    }
  }
}
