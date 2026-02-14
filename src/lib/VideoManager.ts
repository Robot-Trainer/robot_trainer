import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface SimulationCommand {
  command: string;
  [key: string]: any;
}

export interface SimulationResponse {
  type: string;
  [key: string]: any;
}

export class VideoManager extends EventEmitter {
  private pythonProcess: ChildProcess | null = null;
  private stderrBuffer: string = '';
  public wsUrl: string | null = null;

  constructor() {
    super();
  }

  public async startSimulation(command: string, args: string[]) {
    this.stopAll();

    // 1. Spawn Python Simulation
    // stdin piped for commands, stderr piped for responses
    // stdout ignored (or inherited for debugging if needed, but previously piped to ffmpeg)
    console.log('Starting Python simulation with command:', command, 'args:', args);
    this.pythonProcess = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.pythonProcess.on('error', (err) => {
      console.error('Python spawn error:', err);
      this.emit('error', err);
    });
    this.pythonProcess.stdout.on('data', (chunk: Buffer) => {
      // For debugging, you can log stdout if needed
      console.log('[Python stdout]', chunk.toString());
    });
    this.pythonProcess.on('exit', (code) => {
      console.log('Python exited with:', code);
      this.emit('exit', code);
    });

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
              const response: SimulationResponse = JSON.parse(line.slice(8));

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
    this.stderrBuffer = '';
  }
}
