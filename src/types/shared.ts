/** Serial port info returned from scanning connected devices */
export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  productId?: string;
  vendorId?: string;
}

/** Conda environment entry returned by checkAnaconda */
export interface CondaEnv {
  name: string;
  pythonPath: string;
}

/** Result of the checkAnaconda IPC call */
export interface CondaCheckResult {
  found: boolean;
  path?: string;
  envs: CondaEnv[];
}

/** System-level settings shape used in IPC between main and renderer */
export interface SystemSettings {
  pythonPath?: string;
  venvPath?: string;
  condaRoot?: string;
  extraPath?: string;
  envVars?: { key: string; value: string }[];
  featureFlags?: Record<string, boolean>;
  [key: string]: unknown;
}

/** Result row from the joined scenes list query */
export interface SceneListItem {
  id: number;
  name: string;
  notes: string | null;
  sceneXmlPath: string | null;
  createdAt: Date | null;
  robotName: string | null;
  robotModality: string | null;
  cameraCount: number;
}

/** Result of scanning mujoco_menagerie directory */
export interface MenagerieScanResult {
  robots: MenagerieRobot[];
  configurations: MenagerieConfiguration[];
}

export interface MenagerieRobot {
  name: string;
  dirName: string;
  modelPath?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MenagerieConfiguration {
  name: string;
  sceneXmlPath?: string;
  includedRobots?: string[];
  [key: string]: unknown;
}
