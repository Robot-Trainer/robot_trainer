import { spawn, ChildProcess } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface SimulationCommand {
  command: string;
  [key: string]: any;
}

export interface SimulationResponse {
  type: string;
  [key: string]: any;
}

export class VideoManager extends EventEmitter {
  private ffmpegProcess: ChildProcess | null = null;
  private pythonProcess: ChildProcess | null = null;
  private wss: WebSocketServer | null = null;
  private activeClients: Set<WebSocket> = new Set();
  private stderrBuffer: string = '';

  constructor(private wsPort: number = 0) {
    super();
  }

  public async startServer() {
    if (this.wss) return;
    return new Promise<void>((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.wsPort });
      this.wss.on('listening', () => {
        const address = this.wss!.address();
        if (address && typeof address !== 'string') {
            this.wsPort = address.port;
        }
        console.log(`Video WebSocket server started on port ${this.wsPort}`);
        resolve();
      });
      this.wss.on('error', (err) => {
         console.error('VideoManager WS Server Error:', err);
         reject(err);
      });
      this.wss.on('connection', (ws) => {
        this.activeClients.add(ws);
        ws.on('close', () => this.activeClients.delete(ws));
      });
    });
  }

  public getPort(): number {
    return this.wsPort;
  }

  public stopServer() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  private broadcast(chunk: Buffer) {
    for (const client of this.activeClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(chunk);
      }
    }
  }

  private getFfmpegPath(): string {
    const platform = process.platform;
    let platformDir = '';
    let ext = '';
    if (platform === 'win32') {
      platformDir = 'win';
      ext = '.exe';
    } else if (platform === 'darwin') {
      platformDir = 'mac';
    } else if (platform === 'linux') {
      platformDir = 'linux';
    }

    const possiblePaths = [];
    
    if (app.isPackaged) {
       possiblePaths.push(path.join(process.resourcesPath, 'bin', platformDir, `ffmpeg${ext}`));
    } else {
       possiblePaths.push(path.join(app.getAppPath(), 'src', 'bin', platformDir, `ffmpeg${ext}`));
    }

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    console.warn('Bundled ffmpeg not found, falling back to system PATH');
    return 'ffmpeg';
  }

  public async startSimulation(command: string, args: string[], recordingPath: string) {
    this.stopAll();
    await this.startServer();

    // 1. Spawn Python Simulation
    // stdin piped for commands, stdout piped for raw frames, stderr piped for responses
    this.pythonProcess = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.pythonProcess.on('error', (err) => console.error('Python spawn error:', err));
    this.pythonProcess.on('exit', (code) => console.log('Python exited with:', code));

    // Parse stderr for command responses (prefixed with __CMD__:) and log the rest
    if (this.pythonProcess.stderr) {
      this.pythonProcess.stderr.on('data', (chunk: Buffer) => {
        this.stderrBuffer += chunk.toString();
        const lines = this.stderrBuffer.split('\n');
        // Keep the last partial line in the buffer
        this.stderrBuffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('__CMD__:')) {
            try {
              const response: SimulationResponse = JSON.parse(line.slice(7));
              this.emit('simulation-response', response);
            } catch (e) {
              console.error('Failed to parse simulation response:', line);
            }
          } else if (line.trim()) {
            // Forward non-command stderr to console
            console.log('[Python]', line);
          }
        }
      });
    }

    // 2. Spawn FFmpeg
    // Input: rawvideo from pipe:0
    // Output 1: H.264 MP4 to disk
    // Output 2: MPEG1 MPEG-TS to pipe:1 (for JSMpeg)
    const ffmpegArgs = [
      '-f', 'rawvideo',
      '-pixel_format', 'rgb24',
      '-video_size', '640x480',
      '-framerate', '30',
      '-i', 'pipe:0', // Read from stdin
      '-filter_complex', '[0:v]split=2[rec][stream]',
      
      // Output 1: Recording
      '-map', '[rec]',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-y', recordingPath,

      // Output 2: Stream
      '-map', '[stream]',
      '-c:v', 'mpeg1video',
      '-b:v', '1000k', // Bitrate
      '-bf', '0', // No B-frames for lower latency
      '-f', 'mpegts',
      'pipe:1' // Write to stdout
    ];

    this.ffmpegProcess = spawn(this.getFfmpegPath(), ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'inherit'] // stdin from python, stdout to WS
    });

    this.ffmpegProcess.on('error', (err) => console.error('FFmpeg spawn error:', err));
    this.ffmpegProcess.on('exit', (code) => console.log('FFmpeg exited with:', code));

    // Pipe Python stdout -> FFmpeg stdin
    if (this.pythonProcess.stdout && this.ffmpegProcess.stdin) {
      this.pythonProcess.stdout.pipe(this.ffmpegProcess.stdin);
    }

    // Pipe FFmpeg stdout -> WebSocket clients
    if (this.ffmpegProcess.stdout) {
      this.ffmpegProcess.stdout.on('data', (chunk: Buffer) => {
        this.broadcast(chunk);
      });
    }
  }

  public async startCamera(devicePath: string, recordingPath: string) {
    this.stopAll();
    await this.startServer();

    // Input: V4L2 device
    const ffmpegArgs = [
      '-f', 'v4l2',
      '-framerate', '30',
      '-video_size', '640x480',
      '-i', devicePath,
      '-filter_complex', '[0:v]split=2[rec][stream]',
      
      // Output 1: Recording
      '-map', '[rec]',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-y', recordingPath,

      // Output 2: Stream
      '-map', '[stream]',
      '-c:v', 'mpeg1video',
      '-b:v', '1000k',
      '-bf', '0',
      '-f', 'mpegts',
      'pipe:1'
    ];

    this.ffmpegProcess = spawn(this.getFfmpegPath(), ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'inherit']
    });

    this.ffmpegProcess.on('error', (err) => console.error('FFmpeg spawn error:', err));
    this.ffmpegProcess.on('exit', (code) => console.log('FFmpeg exited with:', code));

    if (this.ffmpegProcess.stdout) {
      this.ffmpegProcess.stdout.on('data', (chunk: Buffer) => {
        this.broadcast(chunk);
      });
    }
  }

  public async startRTSP(url: string, recordingPath: string) {
    this.stopAll();
    await this.startServer();

    const ffmpegArgs = [
      '-rtsp_transport', 'tcp', // Force TCP for reliability
      '-i', url,
      '-filter_complex', '[0:v]split=2[rec][stream]',
      
      // Output 1: Recording
      '-map', '[rec]',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-y', recordingPath,

      // Output 2: Stream
      '-map', '[stream]',
      '-c:v', 'mpeg1video',
      '-b:v', '1000k',
      '-bf', '0',
      '-f', 'mpegts',
      'pipe:1'
    ];

    this.ffmpegProcess = spawn(this.getFfmpegPath(), ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'inherit']
    });

    this.ffmpegProcess.on('error', (err) => console.error('FFmpeg spawn error:', err));
    this.ffmpegProcess.on('exit', (code) => console.log('FFmpeg exited with:', code));

    if (this.ffmpegProcess.stdout) {
      this.ffmpegProcess.stdout.on('data', (chunk: Buffer) => {
        this.broadcast(chunk);
      });
    }
  }

  /**
   * Send a JSON command to the Python simulation process via stdin.
   * Commands are newline-delimited JSON objects.
   */
  public sendCommand(cmd: SimulationCommand): boolean {
    if (!this.pythonProcess || !this.pythonProcess.stdin || this.pythonProcess.stdin.destroyed) {
      console.warn('Cannot send command: Python process not running or stdin closed');
      return false;
    }
    try {
      const line = JSON.stringify(cmd) + '\n';
      return this.pythonProcess.stdin.write(line);
    } catch (e) {
      console.error('Failed to send command to Python process:', e);
      return false;
    }
  }

  public stopAll() {
    if (this.pythonProcess) {
      // Close stdin gracefully before killing
      if (this.pythonProcess.stdin && !this.pythonProcess.stdin.destroyed) {
        this.pythonProcess.stdin.end();
      }
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGINT'); // Allow graceful exit for MP4
      this.ffmpegProcess = null;
    }
    this.stderrBuffer = '';
  }
}
