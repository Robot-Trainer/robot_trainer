export type CameraModality = "real" | "simulated";

export type CameraPose = {
  pos: [number, number, number];
  quat: [number, number, number, number];
  xyaxes: [number, number, number, number, number, number];
};

export type CameraData = {
  id: number;
  name: string;
  modality: CameraModality;
  serialNumber: string;
  resolution: string;
  fps: number;
  pose: CameraPose;
  data: Record<string, unknown>;
  isXml?: boolean;
};

const defaultPose: CameraPose = {
  pos: [0, 0, 0],
  quat: [1, 0, 0, 0],
  xyaxes: [1, 0, 0, 0, 1, 0],
};

const asFiniteNumber = (value: unknown, fallback: number): number => {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
};

const asNumberTuple = <T extends number[]>(
  value: unknown,
  fallback: T,
): T => {
  if (!Array.isArray(value) || value.length !== fallback.length) return fallback;
  return value.map((v, i) => asFiniteNumber(v, fallback[i])) as T;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const normalizeCamera = (camera: unknown): CameraData => {
  const raw = asRecord(camera);
  const rawData = asRecord(raw.data);
  const rawMujoco = asRecord(rawData.mujoco);
  const pose: CameraPose = {
    pos: asNumberTuple(raw.pose?.pos ?? rawMujoco.pos, [
      asFiniteNumber(raw.posX, defaultPose.pos[0]),
      asFiniteNumber(raw.posY, defaultPose.pos[1]),
      asFiniteNumber(raw.posZ, defaultPose.pos[2]),
    ]),
    quat: asNumberTuple(raw.pose?.quat ?? rawMujoco.quat, [
      asFiniteNumber(raw.quatW, defaultPose.quat[0]),
      asFiniteNumber(raw.quatX, defaultPose.quat[1]),
      asFiniteNumber(raw.quatY, defaultPose.quat[2]),
      asFiniteNumber(raw.quatZ, defaultPose.quat[3]),
    ]),
    xyaxes: asNumberTuple(raw.pose?.xyaxes ?? rawMujoco.xyaxes, [
      asFiniteNumber(raw.xyaxesX1, defaultPose.xyaxes[0]),
      asFiniteNumber(raw.xyaxesY1, defaultPose.xyaxes[1]),
      asFiniteNumber(raw.xyaxesZ1, defaultPose.xyaxes[2]),
      asFiniteNumber(raw.xyaxesX2, defaultPose.xyaxes[3]),
      asFiniteNumber(raw.xyaxesY2, defaultPose.xyaxes[4]),
      asFiniteNumber(raw.xyaxesZ2, defaultPose.xyaxes[5]),
    ]),
  };

  return {
    id: asFiniteNumber(raw.id, Date.now() + Math.floor(Math.random() * 1000000)),
    name: String(raw.name || "").trim(),
    modality: raw.modality === "simulated" ? "simulated" : "real",
    serialNumber: String(raw.serialNumber ?? raw.serial_number ?? "").trim(),
    resolution: String(raw.resolution || "").trim(),
    fps: Math.max(0, Math.round(asFiniteNumber(raw.fps, 0))),
    pose,
    data: rawData,
    ...(raw.isXml ? { isXml: true } : {}),
  };
};

export const normalizeCameraList = (value: unknown): CameraData[] => {
  if (!Array.isArray(value)) return [];
  return value.map((camera) => normalizeCamera(camera));
};

