import { Connection } from '../types';

function concatUint8(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

export class SerialConnection implements Connection {
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  constructor(private readonly port: SerialPort) {}

  async open(baudRate: number = 1000000): Promise<boolean> {
    try {
      await this.port.open({ baudRate });
      this.writer = this.port.writable.getWriter();
      this.reader = this.port.readable.getReader();
      return true;
    } catch (error) {
      console.error('Failed to open port:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        // Ignore
      }
      this.reader.releaseLock();
      this.reader = null;
    }
    if (this.writer) {
      try {
        await this.writer.close();
      } catch {
        // Ignore
      }
      this.writer.releaseLock();
      this.writer = null;
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // Ignore
      }
    }
  }

  async write(buffer: Uint8Array): Promise<void> {
    if (!this.writer) {
      throw new Error('Port is not open for writing');
    }
    await this.writer.write(buffer);
  }

  async readAtLeast(minBytes: number, timeoutMs = 300): Promise<Uint8Array> {
    if (!this.reader) {
      throw new Error('Port is not open for reading');
    }

    let chunks = new Uint8Array(0);
    const deadline = Date.now() + timeoutMs;

    while (chunks.length < minBytes && Date.now() < deadline) {
      const timeoutPromise = new Promise<{ value: undefined; done: true }>((resolve) => {
        setTimeout(
          () => resolve({ value: undefined, done: true }),
          Math.max(1, deadline - Date.now())
        );
      });

      const result = await Promise.race([this.reader.read(), timeoutPromise]);

      if (result.done) {
        break; // Stream closed or Timeout
      }

      if (result.value) {
        chunks = concatUint8(chunks, result.value);
      }
    }

    return chunks;
  }
}
