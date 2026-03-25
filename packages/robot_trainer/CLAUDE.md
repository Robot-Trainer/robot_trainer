# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Install dependencies**: `npm install`
- **Lint**: `npm run lint`
- **Run all tests**: `npm run test`
- **Run Playwright tests**: `npm run test:playwright`
- **Run a single test file**: `npx vitest run <path/to/test.spec.ts>`
- **Start development**: `npm run start` (generates DB migrations, starts Electron with logging)
- **Start with profile debugging**: `npm run start:profile`
- **Build web bundle**: `npm run build:web`
- **Start web dev server**: `npm run dev:web`
- **Package the Electron app**: `npm run package`
- **Make installers**: `npm run make`
- **Publish to GitHub releases**: `npm run publish`
- **Full release (DB + publish)**: `npm run release`
- **Generate database migrations**: `npm run db:generate`
- **Download FFmpeg binaries**: `npm run download-ffmpeg`

## High‑Level Architecture

```
src/
 ├─ main.ts                # Electron main process – window creation, IPC
 ├─ renderer.ts            # Renderer process – React + Three.js UI
 ├─ preload.ts             # Preload script for secure IPC between renderer & main
 ├─ web-preload.ts         # Web‑only preload (for Playwright tests)
 ├─ server/
 │    └─ index.ts          # Express server exposing API used by the renderer
 ├─ db/
 │    ├─ schema.ts         # Drizzle ORM schema
 │    ├─ migrate.ts         # Migration helpers
 │    └─ ...                # Seed data, selectors, etc.
 ├─ lib/
 │    ├─ MujocoSimulation.ts
 │    │   # MuJoCo physics simulation, uses wasm
 │    ├─ serial_devices.ts
 │    │   # Handles serial port communication with robots
 │    ├─ VideoManager.ts
 │    ├─ uiStore.ts
 │    └─ ...                # Helpers, config, profiling
 └─ tests/
      ├─ *.spec.ts          # Vitest unit tests
      ├─ web-fixtures.ts     # Playwright test fixtures
      └─ ...                # Integration & system tests
```

* **Electron** – The desktop application runs a single‑window Electron instance. `main.ts` starts the app, creates a `BrowserWindow`, and loads `renderer.ts`.
* **Renderer** – The UI is a React + Three.js application. It communicates with the main process via IPC exposed in `preload.ts`.
* **Server** – An Express API (`src/server/index.ts`) runs as a node process, providing endpoints for configuration, telemetry, and other services.
* **Database** – Powered by Drizzle‑Kit/ORM, the schema lives in `src/db/schema.ts`. Migrations are generated with `npm run db:generate` and applied automatically on startup.
* **MuJoCo** – Physics simulation is encapsulated in `src/lib/MujocoSimulation.ts`, which loads the MuJoCo WebAssembly bundle.
* **Serial Devices** – Serial port handling (e.g., robot controllers) is in `src/lib/serial_devices.ts`.
* **Testing** – Uses Vitest for unit tests and Playwright for end‑to‑end tests. Fixtures live in `src/tests/web-fixtures.ts`.

## Running Tests

```bash
# Unit tests
npm run test

# Single file test
npx vitest run src/tests/robots.spec.ts

# Playwright tests
npm run test:playwright
# or for web mode
npm run test:playwright:web
```

## Building for Production

```bash
npm run build:web    # Builds the web bundle
npm run package      # Builds the Electron app
npm run make         # Creates installer packages
```

## Environment Variables

The app reads configuration from a `.env` file. Common variables:

- `DATABASE_URL` – PostgreSQL connection string (used by Drizzle)
- `FFMPEG_BIN_PATH` – Path to FFmpeg binaries downloaded by `npm run download-ffmpeg`
- `NODE_ENV` – `development` or `production`

## Notes

- All database migrations are auto‑generated on start; avoid manual changes to the migration files.
- For debugging, `npm run start:profile` adds `--profile-startup` to Electron.
- Playwright tests use a Chromium browser.