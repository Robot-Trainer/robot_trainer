/**
 * Web-mode implementation of window.electronAPI.
 *
 * In Electron the preload script (src/preload.ts) injects window.electronAPI
 * via contextBridge before the renderer page loads.  In web mode there is no
 * Electron, so this module provides an equivalent implementation:
 *
 *  • "invoke"-style calls → HTTP POST /api/:channel  (handled by src/server/index.ts)
 *  • "on"-style event subscriptions → Socket.IO events pushed from the server
 *
 * This file is imported as the first side-effect of src/renderer.web.ts so
 * that window.electronAPI is available before React mounts.
 */

import { io, Socket } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Shared Socket.IO connection (lazy – created on first use)
// ---------------------------------------------------------------------------
let _socket: Socket | null = null;

function getSocket(): Socket {
  if (!_socket) {
    // Connect to the same origin the page was served from.
    _socket = io('/', { transports: ['websocket', 'polling'] });
  }
  return _socket;
}

// ---------------------------------------------------------------------------
// Helper: HTTP POST /api/:channel  →  promise of the result value
// ---------------------------------------------------------------------------
async function invokeApi(channel: string, ...args: any[]): Promise<any> {
  const res = await fetch(`/api/${encodeURIComponent(channel)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as any)?.error ?? `API error (${res.status})`);
  }
  return (data as any).result;
}

// ---------------------------------------------------------------------------
// Helper: subscribe to a Socket.IO event; returns an unsubscribe function
// ---------------------------------------------------------------------------
function onEvent(channel: string, cb: (...args: any[]) => void): () => void {
  const socket = getSocket();
  socket.on(channel, cb);
  return () => socket.off(channel, cb);
}

// ---------------------------------------------------------------------------
// window.electronAPI — matches the ElectronAPI interface in electron-api.d.ts
// ---------------------------------------------------------------------------
(window as any).electronAPI = {
  // ── Invoke-style calls ──────────────────────────────────────────────────
  getUsername: () => invokeApi("get-username"),
  getDefaultDatasetDir: (repoId: string) =>
    invokeApi("get-default-dataset-dir", repoId),
  selectDatasetDirectory: () => invokeApi("select-dataset-directory"),
  scanSerialPorts: () => invokeApi("scan-serial-ports"),
  saveSystemSettings: (settings: any) =>
    invokeApi("save-system-settings", settings),
  checkAnaconda: () => invokeApi("check-anaconda"),
  createAnacondaEnv: (name: string) => invokeApi("create-anaconda-env", name),
  installMiniconda: () => invokeApi("install-miniconda"),
  installLerobot: () => invokeApi("install-lerobot"),
  checkLerobot: () => invokeApi("check-lerobot"),
  scanMujocoMenagerie: () => invokeApi("scan-mujoco-menagerie"),
  saveRobotConfig: (config: any) => invokeApi("save-robot-config", config),
  // setConfig is an alias for saveRobotConfig — mirrors the Electron preload.ts alias.
  setConfig: (config: any) => invokeApi("save-robot-config", config),
  openAdminWindow: (dbName: string) => invokeApi("open-admin-window", dbName),
  getMigrations: () => invokeApi("get-migrations"),
  openVideoWindow: (url: string) => invokeApi("open-video-window", url),

  selectModelFile: () => invokeApi("select-model-file"),
  readModelFile: (filePath: string) => invokeApi("read-model-file", filePath),
  saveRobotModelZip: (sourceFilePath: string) =>
    invokeApi("save-robot-model-zip", sourceFilePath),
  saveRobotModelFile: (sourceFilePath: string) =>
    invokeApi("save-robot-model-file", sourceFilePath),

  // ── Reply helpers (renderer → server via Socket.IO) ─────────────────────
  replyLoadSystemSettings: (settings: any) =>
    getSocket().emit("reply-load-system-settings", settings),
  replySaveSystemSettings: (result: any) =>
    getSocket().emit("reply-save-system-settings", result),

  // ── Event subscriptions (server → renderer via Socket.IO) ───────────────
  onRequestLoadSystemSettings: (cb: () => void) =>
    onEvent("request-load-system-settings", cb),
  onRequestSaveSystemSettings: (cb: (settings: any) => void) =>
    onEvent("request-save-system-settings", cb),
  onSystemSettingsChanged: (cb: (data: any) => void) =>
    onEvent("system-settings-changed", cb),
  onOpenSetupWizard: (cb: () => void) => onEvent("open-setup-wizard", cb),
  onInstallMinicondaOutput: (cb: (data: string) => void) =>
    onEvent("install-miniconda-output", cb),
  onCreateAnacondaEnvOutput: (cb: (data: string) => void) =>
    onEvent("create-anaconda-env-output", cb),
  onInstallLerobotOutput: (cb: (data: string) => void) =>
    onEvent("install-lerobot-output", cb),
};
