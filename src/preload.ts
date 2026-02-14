// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld("electronAPI", {
  getUsername: () => ipcRenderer.invoke('get-username'),
  scanSerialPorts: () => ipcRenderer.invoke("scan-serial-ports"),
  saveSystemSettings: (settings: any) =>
    ipcRenderer.invoke("save-system-settings", settings),
  checkAnaconda: () => ipcRenderer.invoke("check-anaconda"),
  createAnacondaEnv: (name: string) =>
    ipcRenderer.invoke("create-anaconda-env", name),
  installMiniconda: () => ipcRenderer.invoke('install-miniconda'),
  installLerobot: () => ipcRenderer.invoke('install-lerobot'),
  checkLerobot: () => ipcRenderer.invoke('check-lerobot'),
  scanMujocoMenagerie: () => ipcRenderer.invoke('scan-mujoco-menagerie'),
  saveRobotConfig: (config: any) =>
    ipcRenderer.invoke("save-robot-config", config),
  setConfig: (config: any) =>
    ipcRenderer.invoke("save-robot-config", config),
  openAdminWindow: (dbName: string) => ipcRenderer.invoke('open-admin-window', dbName),
  // Main -> Renderer requests: renderer should listen and reply
  onRequestLoadSystemSettings: (cb: () => void) => {
    const listener = (_: any) => cb();
    ipcRenderer.on('request-load-system-settings', listener);
    return () => ipcRenderer.removeListener('request-load-system-settings', listener);
  },
  onRequestSaveSystemSettings: (cb: (settings: any) => void) => {
    const listener = (_: any, settings: any) => cb(settings);
    ipcRenderer.on('request-save-system-settings', listener);
    return () => ipcRenderer.removeListener('request-save-system-settings', listener);
  },
  // Renderer replies back to main via these helper methods
  replyLoadSystemSettings: (settings: any) => ipcRenderer.send('reply-load-system-settings', settings),
  replySaveSystemSettings: (result: any) => ipcRenderer.send('reply-save-system-settings', result),
  onSystemSettingsChanged: (cb: (data: any) => void) => {
    const listener = (_: any, data: any) => cb(data);
    ipcRenderer.on("system-settings-changed", listener);
    return () =>
      ipcRenderer.removeListener("system-settings-changed", listener);
  },
  onOpenSetupWizard: (cb: () => void) => {
    const listener = (_: any) => cb();
    ipcRenderer.on('open-setup-wizard', listener);
    return () => ipcRenderer.removeListener('open-setup-wizard', listener);
  },
  getMigrations: () => ipcRenderer.invoke('get-migrations')
  ,
  startSimulation: (config?: any) => ipcRenderer.invoke('start-simulation', config),
  stopSimulation: () => ipcRenderer.invoke('stop-simulation'),
  startCamera: (devicePath: string) => ipcRenderer.invoke('start-camera', devicePath),
  openVideoWindow: (url: string) => ipcRenderer.invoke('open-video-window', url),
  startRTSP: (url: string) => ipcRenderer.invoke('start-rtsp', url),
  stopVideo: (id: string) => ipcRenderer.invoke('stop-video', id),
  onSimulationFrame: (cb: (base64jpeg: string) => void) => {
    const listener = (_: any, data: string) => cb(data);
    ipcRenderer.on('simulation-frame', listener);
    return () => ipcRenderer.removeListener('simulation-frame', listener);
  },
  onSimulationStopped: (cb: (info: any) => void) => {
    const listener = (_: any, data: any) => cb(data);
    ipcRenderer.on('simulation-stopped', listener);
    return () => ipcRenderer.removeListener('simulation-stopped', listener);
  },
  onInstallMinicondaOutput: (cb: (data: string) => void) => {
    const listener = (_: any, data: string) => cb(data);
    ipcRenderer.on('install-miniconda-output', listener);
    return () => ipcRenderer.removeListener('install-miniconda-output', listener);
  },
  onCreateAnacondaEnvOutput: (cb: (data: string) => void) => {
    const listener = (_: any, data: string) => cb(data);
    ipcRenderer.on('create-anaconda-env-output', listener);
    return () => ipcRenderer.removeListener('create-anaconda-env-output', listener);
  },
  onInstallLerobotOutput: (cb: (data: string) => void) => {
    const listener = (_: any, data: string) => cb(data);
    ipcRenderer.on('install-lerobot-output', listener);
    return () => ipcRenderer.removeListener('install-lerobot-output', listener);
  },
  getSimulationState: () => ipcRenderer.invoke('get-simulation-state'),
  onSimulationStateChanged: (cb: (state: { running: boolean; wsUrl?: string }) => void) => {
    const listener = (_: any, state: any) => cb(state);
    ipcRenderer.on('simulation-state-changed', listener);
    return () => ipcRenderer.removeListener('simulation-state-changed', listener);
  },
  onSimulationError: (cb: (error: any) => void) => {
    const listener = (_: any, error: any) => cb(error);
    ipcRenderer.on('simulation-error', listener);
    return () => ipcRenderer.removeListener('simulation-error', listener);
  },
  selectModelFile: () => ipcRenderer.invoke('select-model-file'),
  readModelFile: (filePath: string) => ipcRenderer.invoke('read-model-file', filePath),
  saveRobotModelZip: (sourceFilePath: string) => ipcRenderer.invoke('save-robot-model-zip', sourceFilePath),
  saveRobotModelFile: (sourceFilePath: string) => ipcRenderer.invoke('save-robot-model-file', sourceFilePath),
});