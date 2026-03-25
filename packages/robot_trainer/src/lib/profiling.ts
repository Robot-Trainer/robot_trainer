import { app, contentTracing } from 'electron';
import path from 'node:path';
import fs from 'fs/promises';

const STARTUP_PROFILE_SWITCH = '--profile-startup';
export const STARTUP_TRACE_STOP_DELAY_MS = 3000;
const startupProfilingEnabled = process.argv.includes(STARTUP_PROFILE_SWITCH);
let startupTraceDir: string | null = null;
let startupTraceStarted = false;
let startupTraceStopped = false;

const startupTraceTimestamp = () => {
  return new Date().toISOString().replace(/[:.]/g, '-');
};

export const setupStartupProfiling = async () => {
  if (!startupProfilingEnabled) return;

  try {
    const baseDir = path.join(app.getPath('userData'), 'profiles', `startup-${startupTraceTimestamp()}`);
    await fs.mkdir(baseDir, { recursive: true });
    startupTraceDir = baseDir;

    await contentTracing.startRecording({
      included_categories: [
        'toplevel',
        'benchmark',
        'v8',
        'ipc',
        'devtools.timeline',
        'disabled-by-default-v8.cpu_profiler',
        'disabled-by-default-v8.cpu_profiler.hires',
      ],
    });

    startupTraceStarted = true;
    console.log(`[profiling] startup tracing enabled: ${startupTraceDir}`);
  } catch (error) {
    console.error('[profiling] failed to start startup tracing', error);
  }
};

export const stopStartupProfiling = async (reason: string) => {
  if (!startupProfilingEnabled || !startupTraceStarted || startupTraceStopped || !startupTraceDir) return;

  startupTraceStopped = true;
  const tracePath = path.join(startupTraceDir, 'startup.trace.json');

  try {
    const outPath = await contentTracing.stopRecording(tracePath);
    console.log(`[profiling] startup trace saved (${reason}): ${outPath || tracePath}`);
  } catch (error) {
    console.error('[profiling] failed to stop startup tracing', error);
  }
};
