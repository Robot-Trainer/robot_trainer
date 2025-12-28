export default class Camera {
  serialNumber: string;
  name: string;
  resolution?: string | null;
  fps?: number | null;

  constructor(opts: { serialNumber: string; name: string; resolution?: string | null; fps?: number | null }) {
    this.serialNumber = opts.serialNumber;
    this.name = opts.name;
    this.resolution = opts.resolution ?? null;
    this.fps = opts.fps ?? null;
  }

  toJSON() {
    return {
      serialNumber: this.serialNumber,
      name: this.name,
      resolution: this.resolution,
      fps: this.fps,
    };
  }

  static fromJSON(obj: any) {
    return new Camera({
      serialNumber: obj.serialNumber || '',
      name: obj.name || '',
      resolution: obj.resolution ?? null,
      fps: obj.fps ?? null,
    });
  }
}