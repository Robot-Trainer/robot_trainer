# Robot Trainer

<hr>

### 🚧 **This project is in a development/pre-aplha phase.** 🚧

That is, its primary features are being actively implemented. Do not expect it to work out of the box, but do feel free to contribute to its development.

<hr>

**Overview**

Robot Trainer is an application (currently desktop, but aspiring to be fully-web based) designed to simplify the robot training workflow. Our mission is to make it easy enough for anyone to train their robot on new tasks.

**Quick Links**
- **Repository root**: [package.json](package.json)
- **Main process / preload / renderer**: [src/main.ts](src/main.ts), [src/preload.ts](src/preload.ts), [src/renderer.ts](src/renderer.ts)
- **Bundled Python code**: [src/python](src/python)

**Development Requirements**
- Node.js (recommended v18+)

**Quick Start (development)**

Install dependencies:

```bash
npm install
```

Run the app in development (renderer served by Vite):

```bash
npm run start
```


**Scripts**
- `npm run db:generate` — Generate Drizzle DB migrations (in drizzle).
- `npm run start` — Start Electron using electron-forge (development).
- `npm run start:profile` — Start Electron with startup profiling enabled.
- `npm run package` — Package the Electron app.
- `npm run download-ffmpeg` — Download prebuilt ffmpeg via `scripts/download_ffmpeg.js`.
- `npm test` — Run unit tests via `vitest`.
- `npm run test:playwright` — Build/package and run Playwright tests (integration).
- `npm run make` — Produce OS installers using electron-forge makers.
- `npm run publish` — Publish the packaged app using electron-forge.
- `npm run release` — Generate DB assets and publish Electron Forge binaries to GitHub Releases.
- `npm run lint` — Run ESLint across the project.
- `npm run build:web` — Build the web renderer via Vite.
- `npm run dev:web` — Start the Vite dev server for the web build.
- `npm run start:web` — Start the app server (`tsx src/server/index.ts`).
- `npm run test:playwright:web` — Run Playwright tests in web mode.

**Project Structure (high level)**

- `src/` — Application source
  - `main.ts` — Electron main process entry
  - `preload.ts` — Preload script exposing safe APIs
  - `renderer.tsx` / `app.tsx` — React renderer
  - `ui/` — Reusable UI components
  - `views/` — App views
  - `lib/` — Core logic, device integration, tests
  - `python/` — Python helper script and PyInstaller config
- `forge.config.ts` — electron-forge config (extra resource includes built Python binary)
- `vite.*.config.*` — Vite configs for main, preload, renderer
- `package.json` — Scripts and dependencies

**Building & Packaging**

Before packaging, build the Python binary (this is also run automatically by the `prepackage` script):

Then package the Electron app (example):

```bash
npm run package
# or
npm run make
```

Note: `forge.config.ts` includes `extraResource: ['src/python/dist']` so the packaged app can find the Python executable at runtime.

**Testing**

- Unit tests: `npm test` (uses `vitest`, configured in `vitest.config.ts` to include `src/**/*.test.ts`).
- Integration / E2E: `npm run test:playwright` — packages the app and runs Playwright tests defined in `src/tests`.

**Development Notes**

- The `vite.main.config.ts` marks `serialport` as external to avoid bundling native bindings into the renderer/main bundle.
- Electron version and native module compatibility can be sensitive; if you change Electron, rebuild native modules (e.g., `electron-rebuild`) as needed.
- The renderer uses React + Tailwind; Vite config for the renderer is in `vite.renderer.config.mts`.

**Where to look for robot integrations**
- `src/lib/robot.ts` and `src/lib/serial_devices.ts` contain core device and serial port logic.
- Mock modules and tests are in `src/robot_sdk/testing/mock_modules` and `src/lib/test_fixtures.ts` respectively.

**License & Author**
- Author: Bernie Telles <btelles@gmail.com>
- License: MIT
