import type { JsonObject } from './json';

export interface SerialPortInfo {
  path: string;
  manufacturer: string;
  serialNumber: string;
  productId?: string;
  vendorId?: string;
  pnpId?: string;
}

export interface MigrationFile {
  hash: string;
  folderMillis: string;
  sql: string[];
  bps?: boolean;
}

export interface AnacondaEnvInfo {
  name: string;
  pythonPath?: string | null;
}

export interface AnacondaCheckResult {
  found: boolean;
  path: string | null;
  envs: AnacondaEnvInfo[];
  platform?: string;
  condaAvailable?: boolean;
  condaVersion?: string;
  error?: string;
}

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface CreateEnvResult {
  success: boolean;
  code: number;
  output: string;
}

export interface PathResult {
  ok: boolean;
  path?: string;
}

export interface RobotMetadata {
  numJoints: number;
  jointNames: string[];
  actuatorNames: string[];
  siteNames: string[];
  hasGripper: boolean;
  cameras: string[];
}

export interface ModelReadResult {
  content: string;
  format: string;
  baseName: string;
  metadata: RobotMetadata;
  zipPath?: string;
}

export interface SystemSettings extends JsonObject {
  condaRoot?: string;
  pythonPath?: string;
}

export interface ElectronAPI {
  getUsername: () => Promise<string>;
  getDefaultDatasetDir: (repoId: string) => Promise<string>;
  selectDatasetDirectory: () => Promise<string | null>;
  scanSerialPorts: () => Promise<SerialPortInfo[]>;
  getMigrations: () => Promise<MigrationFile[]>;
  saveSystemSettings: (settings: SystemSettings) => Promise<void>;
  loadSystemSettings: () => Promise<SystemSettings>;
  checkAnaconda: () => Promise<AnacondaCheckResult>;
  createAnacondaEnv: (name: string) => Promise<CreateEnvResult>;
  installMiniconda: () => Promise<CommandResult & { path?: string }>;
  installLerobot: () => Promise<CommandResult>;
  checkLerobot: () => Promise<{ installed: boolean }>;
  scanMujocoMenagerie: () => Promise<unknown[]>;
  saveRobotConfig: (config: JsonObject) => Promise<PathResult>;
  setConfig: (config: JsonObject) => Promise<PathResult>;
  openAdminWindow: (dbName: string) => Promise<void>;
  openVideoWindow: (url: string) => Promise<void>;
  onRequestLoadSystemSettings: (cb: () => void) => () => void;
  onRequestSaveSystemSettings: (cb: (settings: SystemSettings) => void) => () => void;
  replyLoadSystemSettings: (settings: SystemSettings) => void;
  replySaveSystemSettings: (result: JsonObject) => void;
  onSystemSettingsChanged: (cb: (data: SystemSettings) => void) => () => void;
  onOpenSetupWizard: (cb: () => void) => () => void;
  onInstallMinicondaOutput: (cb: (data: string) => void) => () => void;
  onCreateAnacondaEnvOutput: (cb: (data: string) => void) => () => void;
  onInstallLerobotOutput: (cb: (data: string) => void) => () => void;
  selectModelFile: () => Promise<string | null>;
  readModelFile: (filePath: string) => Promise<ModelReadResult>;
  saveRobotModelZip: (sourceFilePath: string) => Promise<{ modelPath: string }>;
  saveRobotModelFile: (sourceFilePath: string) => Promise<{ modelPath: string }>;
}
