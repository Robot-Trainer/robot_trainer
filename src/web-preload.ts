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
import type { ElectronAPI, SystemSettings } from './types/electron';
import type { JsonObject } from './types/json';

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
type ApiResultEnvelope<TResult> = {
  result?: TResult;
  error?: string;
};

async function invokeApi<TArgs extends unknown[], TResult>(channel: string, ...args: TArgs): Promise<TResult> {
  const res = await fetch(`/api/${encodeURIComponent(channel)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args }),
  });
  const data = (await res.json()) as ApiResultEnvelope<TResult>;
  if (!res.ok) {
    throw new Error(data.error ?? `API error (${res.status})`);
  }
  return data.result as TResult;
}

// ---------------------------------------------------------------------------
// Helper: subscribe to a Socket.IO event; returns an unsubscribe function
// ---------------------------------------------------------------------------
function onEvent<TArgs extends unknown[]>(channel: string, cb: (...args: TArgs) => void): () => void {
  const socket = getSocket();
  socket.on(channel, cb as (...args: unknown[]) => void);
  return () => socket.off(channel, cb as (...args: unknown[]) => void);
}

// ---------------------------------------------------------------------------
// window.electronAPI — matches the ElectronAPI interface in electron-api.d.ts
// ---------------------------------------------------------------------------
const electronAPI: ElectronAPI = {
  // ── Invoke-style calls ──────────────────────────────────────────────────
  getUsername: () => invokeApi("get-username"),
  getDefaultDatasetDir: (repoId: string) =>
    invokeApi("get-default-dataset-dir", repoId),
  selectDatasetDirectory: () => invokeApi("select-dataset-directory"),
  scanSerialPorts: () => invokeApi("scan-serial-ports"),
  saveSystemSettings: (settings: SystemSettings) =>
    invokeApi("save-system-settings", settings),
  loadSystemSettings: () => invokeApi("load-system-settings"),
  checkAnaconda: () => invokeApi("check-anaconda"),
  createAnacondaEnv: (name: string) => invokeApi("create-anaconda-env", name),
  installMiniconda: () => invokeApi("install-miniconda"),
  installLerobot: () => invokeApi("install-lerobot"),
  checkLerobot: () => invokeApi("check-lerobot"),
  scanMujocoMenagerie: () => invokeApi("scan-mujoco-menagerie"),
  saveRobotConfig: (config: JsonObject) => invokeApi("save-robot-config", config),
  // setConfig is an alias for saveRobotConfig — mirrors the Electron preload.ts alias.
  setConfig: (config: JsonObject) => invokeApi("save-robot-config", config),
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
  replyLoadSystemSettings: (settings: SystemSettings) =>
    getSocket().emit("reply-load-system-settings", settings),
  replySaveSystemSettings: (result: JsonObject) =>
    getSocket().emit("reply-save-system-settings", result),

  // ── Event subscriptions (server → renderer via Socket.IO) ───────────────
  onRequestLoadSystemSettings: (cb: () => void) =>
    onEvent("request-load-system-settings", cb),
  onRequestSaveSystemSettings: (cb: (settings: SystemSettings) => void) =>
    onEvent("request-save-system-settings", cb),
  onSystemSettingsChanged: (cb: (data: SystemSettings) => void) =>
    onEvent("system-settings-changed", cb),
  onOpenSetupWizard: (cb: () => void) => onEvent("open-setup-wizard", cb),
  onInstallMinicondaOutput: (cb: (data: string) => void) =>
    onEvent("install-miniconda-output", cb),
  onCreateAnacondaEnvOutput: (cb: (data: string) => void) =>
    onEvent("create-anaconda-env-output", cb),
  onInstallLerobotOutput: (cb: (data: string) => void) =>
    onEvent("install-lerobot-output", cb),
};

window.electronAPI = electronAPI;
