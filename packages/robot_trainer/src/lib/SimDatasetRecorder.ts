/**
 * Simulated-dataset recorder.
 *
 * Bridges the MuJoCo WASM simulation with
 * lerobot.js `LeRobotEpisode` to capture episodes containing
 * observation states and Three.js canvas video.
 */

import { LeRobotEpisode } from '../../../lerobot/dist';
import type { MujocoSimulation, ObservationData, SimulationState } from './MujocoSimulation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimRecorderConfig {
  fps: number;
  taskDescription?: string;
  /** Camera names whose video should be recorded from the Three.js canvas. */
  cameraNames?: string[];
}

export interface SimEpisodeSummary {
  index: number;
  frameCount: number;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'pending' | 'success' | 'failure';
  taskDescription: string;
}

// ---------------------------------------------------------------------------
// SimDatasetRecorder
// ---------------------------------------------------------------------------

export class SimDatasetRecorder {
  private _sim: MujocoSimulation;
  private _fps: number;
  private _taskDescription: string;
  private _cameraNames: string[];

  // Internal state
  private _isRecording = false;
  private _currentEpisode: LeRobotEpisode | null = null;
  private _episodes: LeRobotEpisode[] = [];
  private _episodeStatuses: ('pending' | 'success' | 'failure')[] = [];
  private _episodeIndex = 0;
  private _frameCount = 0;
  private _startTime = 0;

  // Video recording
  private _mediaRecorders: Map<string, MediaRecorder> = new Map();
  private _videoBlobs: Map<string, Blob[]> = new Map();

  // Callbacks
  onFrameRecorded?: (frameIndex: number, episodeIndex: number) => void;
  onEpisodeFinished?: (summary: SimEpisodeSummary) => void;

  constructor(sim: MujocoSimulation, config: SimRecorderConfig) {
    this._sim = sim;
    this._fps = config.fps;
    this._taskDescription = config.taskDescription ?? 'manipulation';
    this._cameraNames = config.cameraNames ?? sim.cameraSpecs.map(c => c.name);
  }

  // ── Accessors ───────────────────────────────────────────────────────────

  get isRecording(): boolean { return this._isRecording; }
  get episodeCount(): number { return this._episodes.length; }
  get currentFrameCount(): number { return this._frameCount; }
  get currentEpisodeIndex(): number { return this._episodeIndex; }

  get episodes(): SimEpisodeSummary[] {
    return this._episodes.map((ep, i) => ({
      index: i,
      frameCount: ep.frames.length,
      startTime: ep.startTime ?? 0,
      endTime: ep.endTime ?? 0,
      duration: ep.timespan,
      status: this._episodeStatuses[i] ?? 'pending',
      taskDescription: this._taskDescription,
    }));
  }

  // ── Recording lifecycle ────────────────────────────────────────────────

  /**
   * Start recording a new episode. If already recording, finalises the
   * current episode first.
   */
  startRecording(canvas?: HTMLCanvasElement): void {
    if (this._isRecording) {
      this.finishEpisode();
    }

    this._currentEpisode = new LeRobotEpisode();
    this._frameCount = 0;
    this._startTime = performance.now() / 1000;
    this._isRecording = true;

    // Start video recording from canvas if provided
    if (canvas) {
      this._startVideoCapture(canvas);
    }
  }

  /** Record a single frame from the current simulation state. */
  recordFrame(obs: ObservationData, state: SimulationState): void {
    if (!this._isRecording || !this._currentEpisode) return;

    const timestamp = performance.now() / 1000 - this._startTime;

    // Build the frame for LeRobotEpisode
    const frame: Record<string, unknown> = {
      timestamp,
      episode_index: this._episodeIndex,
      task_index: 0,
      'observation.state': Array.from(obs['observation.state']),
      action: Array.from(state.ctrl),
    };

    this._currentEpisode.add(frame);
    this._frameCount++;

    if (this.onFrameRecorded) {
      this.onFrameRecorded(this._frameCount, this._episodeIndex);
    }
  }

  /** Stop recording and finalise the current episode. */
  finishEpisode(status: 'pending' | 'success' | 'failure' = 'pending'): SimEpisodeSummary | null {
    if (!this._isRecording || !this._currentEpisode) return null;

    this._stopVideoCapture();
    this._isRecording = false;

    const summary: SimEpisodeSummary = {
      index: this._episodeIndex,
      frameCount: this._currentEpisode.frames.length,
      startTime: this._currentEpisode.startTime ?? 0,
      endTime: this._currentEpisode.endTime ?? 0,
      duration: this._currentEpisode.timespan,
      status,
      taskDescription: this._taskDescription,
    };

    this._episodes.push(this._currentEpisode);
    this._episodeStatuses.push(status);
    this._episodeIndex++;
    this._currentEpisode = null;

    if (this.onEpisodeFinished) {
      this.onEpisodeFinished(summary);
    }

    return summary;
  }

  /** Annotate the last episode with a success/failure status. */
  annotateLastEpisode(status: 'success' | 'failure'): void {
    if (this._episodeStatuses.length > 0) {
      this._episodeStatuses[this._episodeStatuses.length - 1] = status;
    }
  }

  /** Discard the last recorded episode. */
  discardLastEpisode(): void {
    if (this._episodes.length > 0) {
      this._episodes.pop();
      this._episodeStatuses.pop();
      this._episodeIndex = Math.max(0, this._episodeIndex - 1);
    }
  }

  /** Clear all recorded episodes. */
  clearAll(): void {
    this._episodes = [];
    this._episodeStatuses = [];
    this._episodeIndex = 0;
    this._currentEpisode = null;
    this._isRecording = false;
    this._frameCount = 0;
    this._mediaRecorders.clear();
    this._videoBlobs.clear();
  }

  /** Get regularised episode data at the configured FPS. */
  getRegularisedEpisodes(): { index: number; frames: unknown[]; status: string }[] {
    return this._episodes.map((ep, idx) => {
      const regularised = ep.getInterpolatedRegularEpisode(this._fps, 0);
      return {
        index: idx,
        frames: regularised,
        status: this._episodeStatuses[idx],
      };
    });
  }

  // ── Video capture helpers ──────────────────────────────────────────────

  private _startVideoCapture(canvas: HTMLCanvasElement): void {
    try {
      const stream = canvas.captureStream(this._fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: this._getVideoMimeType(),
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      this._mediaRecorders.set('main', recorder);
      this._videoBlobs.set('main', chunks);
      recorder.start(100); // timeslice 100ms
    } catch (e) {
      console.warn('Could not start video capture from canvas:', e);
    }
  }

  private _stopVideoCapture(): void {
    for (const [key, recorder] of this._mediaRecorders.entries()) {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      this._mediaRecorders.delete(key);
    }
  }

  private _getVideoMimeType(): string {
    const preferred = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
    for (const mime of preferred) {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return 'video/webm';
  }

  /** Get recorded video blob for the last episode. */
  getLastVideoBlob(): Blob | null {
    const chunks = this._videoBlobs.get('main');
    if (!chunks || chunks.length === 0) return null;
    return new Blob(chunks, { type: this._getVideoMimeType() });
  }

  // ── Export ──────────────────────────────────────────────────────────────

  /**
   * Export all episodes as a LeRobot v2.1-compatible dataset.
   * Returns an array of { path, content: Blob } entries.
   */
  async exportAsLerobotDataset(): Promise<{ path: string; content: Blob }[]> {
    // Build a minimal info.json
    const numJoints = this._sim.joints.length;
    const stateSize = numJoints * 2 + (this._sim.hasGripper ? 1 : 0);

    const info: Record<string, unknown> = {
      codebase_version: 'v2.1',
      robot_type: 'simulated',
      total_episodes: this._episodes.length,
      total_frames: this._episodes.reduce((sum, ep) => sum + ep.frames.length, 0),
      fps: this._fps,
      features: {
        'observation.state': { dtype: 'float32', shape: [stateSize] },
        action: { dtype: 'float32', shape: [numJoints] },
      },
      data_path: 'data/chunk-{episode_chunk:03d}/episode_{episode_index:06d}.parquet',
    };

    // For cameras as video
    for (const camName of this._cameraNames) {
      info.features[`observation.images.${camName}`] = {
        dtype: 'video',
        shape: [128, 128, 3],
        video_info: { video: { fps: this._fps } },
      };
    }

    const files: { path: string; content: Blob }[] = [];

    // info.json
    files.push({
      path: 'meta/info.json',
      content: new Blob([JSON.stringify(info, null, 2)], { type: 'application/json' }),
    });

    // tasks.jsonl
    files.push({
      path: 'meta/tasks.jsonl',
      content: new Blob(
        [JSON.stringify({ task_index: 0, task: this._taskDescription }) + '\n'],
        { type: 'application/jsonl' }
      ),
    });

    // episodes.jsonl
    const episodeLines = this._episodes.map((_, i) =>
      JSON.stringify({ episode_index: i, tasks: [this._taskDescription] })
    ).join('\n') + '\n';
    files.push({
      path: 'meta/episodes.jsonl',
      content: new Blob([episodeLines], { type: 'application/jsonl' }),
    });

    // Episode data (simplified — each episode as JSON, not parquet)
    for (let i = 0; i < this._episodes.length; i++) {
      const ep = this._episodes[i];
      const regularised = ep.getInterpolatedRegularEpisode(this._fps, 0);
      const chunk = Math.floor(i / 1000).toString().padStart(3, '0');
      const epIdx = i.toString().padStart(6, '0');

      files.push({
        path: `data/chunk-${chunk}/episode_${epIdx}.json`,
        content: new Blob([JSON.stringify(regularised)], { type: 'application/json' }),
      });
    }

    return files;
  }
}
