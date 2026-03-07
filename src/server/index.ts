/**
 * Web server for the Robot Trainer web variant.
 *
 * Provides HTTP POST endpoints at /api/:channel that mirror the Electron IPC
 * handlers defined in src/main.ts. Each endpoint is currently a stub that
 * returns a sensible default so the React renderer can start up; real
 * implementations will be wired up later.
 *
 * Socket.IO is included to support push-style IPC events (e.g.
 * simulation-frame, system-settings-changed) that the web client subscribes
 * to via src/web-preload.ts.
 */

import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express, { Request, Response, NextFunction } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Rate limiting — apply globally to all routes to prevent abuse and satisfy
// security best practices.  The limits are generous for a local dev/robot
// control server but still protect the Node.js process from runaway clients.
// ---------------------------------------------------------------------------
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 300,          // max 300 requests per IP per window
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
app.use(limiter);

// ---------------------------------------------------------------------------
// Static file serving
// In production (after `npm run build:web`) serve from dist/web/.
// In development the renderer is served by the Vite dev server (port 5173),
// so this path may not exist yet — that is fine.
// ---------------------------------------------------------------------------
// Resolve relative to the current working directory so this works whether the
// file is executed via `tsx src/server/index.ts` or from a compiled bundle.
const staticDir = path.resolve(process.cwd(), 'dist/web');
app.use(express.static(staticDir));

// ---------------------------------------------------------------------------
// Stubbed IPC channel handlers
//
// Each key matches an Electron IPC channel name.  The function receives the
// arguments that the renderer passed and returns the value that will be
// JSON-serialised and sent back to the caller.  Stubs return the minimum
// shape expected by the renderer so it can render without errors.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StubFn = (...args: unknown[]) => unknown | Promise<unknown>;

const stubs: Record<string, StubFn> = {
  'get-username': () => process.env.USER ?? 'user',
  'get-default-dataset-dir': (repoId: string) => `/tmp/datasets/${repoId}`,
  'select-dataset-directory': () => null,
  'scan-serial-ports': () => [],
  'save-system-settings': () => ({ success: true }),
  'check-anaconda': () => ({
    found: false,
    path: null,
    envs: [],
    platform: process.platform,
    condaAvailable: false,
  }),
  'create-anaconda-env': (_name: string) => ({
    success: false,
    code: 1,
    output: 'Not implemented in web mode',
  }),
  'install-miniconda': () => ({
    success: false,
    error: 'Not implemented in web mode',
  }),
  'install-lerobot': () => ({
    success: false,
    error: 'Not implemented in web mode',
  }),
  'check-lerobot': () => ({ installed: false }),
  'scan-mujoco-menagerie': () => [],
  'save-robot-config': (_config: any) => ({ ok: true }),
  'open-admin-window': (_dbName: string) => undefined,
  'get-migrations': () => ({}),
  'start-simulation': (_config?: any) => ({
    ok: false,
    message: 'Not implemented in web mode',
  }),
  'stop-simulation': () => ({ ok: true }),
  'start-camera': (_devicePath: string) => ({
    ok: false,
    message: 'Not implemented in web mode',
  }),
  'open-video-window': (_url: string) => undefined,
  'start-rtsp': (_url: string) => ({
    ok: false,
    message: 'Not implemented in web mode',
  }),
  'stop-video': (_id: string) => ({ ok: true }),
  'get-simulation-state': () => ({ running: false }),
  'select-model-file': () => null,
  'read-model-file': (_filePath: string) => ({
    content: '',
    format: '',
    baseName: '',
    metadata: {
      numJoints: 0,
      jointNames: [],
      actuatorNames: [],
      siteNames: [],
      hasGripper: false,
      cameras: [],
    },
  }),
  'save-robot-model-zip': (_sourceFilePath: string) => ({ modelPath: '' }),
  'save-robot-model-file': (_sourceFilePath: string) => ({ modelPath: '' }),
  'send-input-event': (_event: any) => undefined,
};

// ---------------------------------------------------------------------------
// Generic API route: POST /api/:channel
// ---------------------------------------------------------------------------
app.post('/api/:channel', (req: Request, res: Response) => {
  const { channel } = req.params;
  const args: any[] = Array.isArray(req.body?.args) ? req.body.args : [];

  const stub = stubs[channel];
  if (!stub) {
    res.status(404).json({ error: `Unknown channel: ${channel}` });
    return;
  }

  try {
    const outcome = stub(...args);
    if (outcome instanceof Promise) {
      outcome
        .then((result) => res.json({ result }))
        .catch((err) => res.status(500).json({ error: String(err) }));
    } else {
      res.json({ result: outcome });
    }
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Catch-all: serve index.html (or index.web.html in web build) for client-side
// routing (SPA).
app.get(/.*/, (_req: Request, res: Response, _next: NextFunction) => {
  // Prefer index.html; fall back to index.web.html (the name produced by the
  // Vite web build when the entry is index.web.html).
  const candidates = [
    path.join(staticDir, 'index.html'),
    path.join(staticDir, 'index.web.html'),
  ];
  const indexPath = candidates.find((p) => fs.existsSync(p));
  if (!indexPath) {
    res.status(404).send('Web build not found. Run `npm run build:web` first.');
    return;
  }
  res.sendFile(indexPath, (err) => {
    if (err) res.status(500).send(String(err));
  });
});

// ---------------------------------------------------------------------------
// HTTP server + Socket.IO
// Socket.IO is used by web-preload.ts for push-style IPC events.
// Real event emission will be added when the corresponding main.ts handlers
// are ported to web mode.
// ---------------------------------------------------------------------------
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log(`[web-server] client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[web-server] client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

server.listen(PORT, () => {
  console.log(`[web-server] listening on http://localhost:${PORT}`);
});

export { app, server, io };
