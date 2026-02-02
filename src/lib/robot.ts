export default class Robot {
  serialNumber: string;
  name: string;
  robotModelId?: number | null;
  notes?: string | null;

  constructor(opts: { serialNumber: string; name: string; robotModelId?: number | null; notes?: string | null }) {
    this.serialNumber = opts.serialNumber;
    this.name = opts.name;
    this.robotModelId = opts.robotModelId ?? null;
    this.notes = opts.notes ?? null;
  }

  toJSON() {
    return {
      serialNumber: this.serialNumber,
      name: this.name,
      robotModelId: this.robotModelId,
      notes: this.notes,
    };
  }

  static fromJSON(obj: any) {
    return new Robot({
      serialNumber: obj.serialNumber || '',
      name: obj.name || '',
      robotModelId: obj.robotModelId ?? null,
      notes: obj.notes ?? null,
    });
  }
}