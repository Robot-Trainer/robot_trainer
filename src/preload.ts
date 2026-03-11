// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { ElectronAPI, SystemSettings } from './types/electron';
import type { JsonObject } from './types/json';

type ChannelHandler<TArgs extends unknown[]> = (...args: TArgs) => void;

const electronAPI: ElectronAPI = {
  getUsername: () => ipcRenderer.invoke("get-username"),
  getDefaultDatasetDir: (repoId: string) =>
    ipcRenderer.invoke("get-default-dataset-dir", repoId),
  selectDatasetDirectory: () => ipcRenderer.invoke("select-dataset-directory"),
  scanSerialPorts: () => ipcRenderer.invoke("scan-serial-ports"),
  saveSystemSettings: (settings: SystemSettings) =>
    ipcRenderer.invoke("save-system-settings", settings),
  loadSystemSettings: () => ipcRenderer.invoke("load-system-settings"),
  checkAnaconda: () => ipcRenderer.invoke("check-anaconda"),
  createAnacondaEnv: (name: string) =>
    ipcRenderer.invoke("create-anaconda-env", name),
  installMiniconda: () => ipcRenderer.invoke("install-miniconda"),
  installLerobot: () => ipcRenderer.invoke("install-lerobot"),
  checkLerobot: () => ipcRenderer.invoke("check-lerobot"),
  scanMujocoMenagerie: () => ipcRenderer.invoke("scan-mujoco-menagerie"),
  saveRobotConfig: (config: JsonObject) =>
    ipcRenderer.invoke("save-robot-config", config),
  setConfig: (config: JsonObject) => ipcRenderer.invoke("save-robot-config", config),
  openAdminWindow: (dbName: string) =>
    ipcRenderer.invoke("open-admin-window", dbName),
  openVideoWindow: (url: string) =>
    ipcRenderer.invoke("open-video-window", url),
  // Main -> Renderer requests: renderer should listen and reply
  onRequestLoadSystemSettings: (cb: () => void) => {
    const listener: ChannelHandler<[]> = () => cb();
    ipcRenderer.on("request-load-system-settings", listener);
    return () =>
      ipcRenderer.removeListener("request-load-system-settings", listener);
  },
  onRequestSaveSystemSettings: (cb: (settings: SystemSettings) => void) => {
    const listener = (_event: IpcRendererEvent, settings: SystemSettings) => cb(settings);
    ipcRenderer.on("request-save-system-settings", listener);
    return () =>
      ipcRenderer.removeListener("request-save-system-settings", listener);
  },
  // Renderer replies back to main via these helper methods
  replyLoadSystemSettings: (settings: SystemSettings) =>
    ipcRenderer.send("reply-load-system-settings", settings),
  replySaveSystemSettings: (result: JsonObject) =>
    ipcRenderer.send("reply-save-system-settings", result),
  onSystemSettingsChanged: (cb: (data: SystemSettings) => void) => {
    const listener = (_event: IpcRendererEvent, data: SystemSettings) => cb(data);
    ipcRenderer.on("system-settings-changed", listener);
    return () =>
      ipcRenderer.removeListener("system-settings-changed", listener);
  },
  onOpenSetupWizard: (cb: () => void) => {
    const listener: ChannelHandler<[]> = () => cb();
    ipcRenderer.on("open-setup-wizard", listener);
    return () => ipcRenderer.removeListener("open-setup-wizard", listener);
  },
  getMigrations: () => ipcRenderer.invoke("get-migrations"),
  onInstallMinicondaOutput: (cb: (data: string) => void) => {
    const listener = (_event: IpcRendererEvent, data: string) => cb(data);
    ipcRenderer.on("install-miniconda-output", listener);
    return () =>
      ipcRenderer.removeListener("install-miniconda-output", listener);
  },
  onCreateAnacondaEnvOutput: (cb: (data: string) => void) => {
    const listener = (_event: IpcRendererEvent, data: string) => cb(data);
    ipcRenderer.on("create-anaconda-env-output", listener);
    return () =>
      ipcRenderer.removeListener("create-anaconda-env-output", listener);
  },
  onInstallLerobotOutput: (cb: (data: string) => void) => {
    const listener = (_event: IpcRendererEvent, data: string) => cb(data);
    ipcRenderer.on("install-lerobot-output", listener);
    return () => ipcRenderer.removeListener("install-lerobot-output", listener);
  },
  selectModelFile: () => ipcRenderer.invoke("select-model-file"),
  readModelFile: (filePath: string) =>
    ipcRenderer.invoke("read-model-file", filePath),
  saveRobotModelZip: (sourceFilePath: string) =>
    ipcRenderer.invoke("save-robot-model-zip", sourceFilePath),
  saveRobotModelFile: (sourceFilePath: string) =>
    ipcRenderer.invoke("save-robot-model-file", sourceFilePath),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);