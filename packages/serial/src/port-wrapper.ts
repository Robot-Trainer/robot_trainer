/**
 * Lightweight Web Serial port wrapper with immediate lock release.
 *
 * Each `read()` or `write()` acquires a stream lock, performs the I/O,
 * and immediately releases the lock.  This is simpler than the
 * coordinator-based {@link SerialConnection} and is well-suited for
 * scenarios where exclusive ownership bookkeeping is not needed.
 */
export class WebSerialPortWrapper {
  private port: SerialPort;

  constructor(port: SerialPort) {
    this.port = port;
  }

  /** Returns `true` when the underlying port has both readable and writable streams. */
  get isOpen(): boolean {
    return (
      this.port !== null &&
      this.port.readable !== null &&
      this.port.writable !== null
    );
  }

  /**
   * Asserts that the port is ready for I/O.
   *
   * @throws If the port lacks readable or writable streams.
   */
  async initialize(): Promise<void> {
    if (!this.port.readable || !this.port.writable) {
      throw new Error("Port is not open for reading/writing");
    }
  }

  /**
   * Writes data to the port, acquiring and immediately releasing the writer lock.
   *
   * @param data - The bytes to send.
   * @throws If the port is not open for writing.
   */
  async write(data: Uint8Array): Promise<void> {
    if (!this.port.writable) {
      throw new Error("Port not open for writing");
    }

    const writer = this.port.writable.getWriter();
    try {
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * Reads a single chunk from the port with a timeout.
   *
   * @param timeout - Maximum time to wait in milliseconds (default `1000`).
   * @returns The received bytes.
   * @throws On timeout, if the port is closed mid-read, or if no data arrives.
   */
  async read(timeout: number = 1000): Promise<Uint8Array> {
    if (!this.port.readable) {
      throw new Error("Port not open for reading");
    }

    const reader = this.port.readable.getReader();

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Read timeout")), timeout);
      });

      const result = await Promise.race([reader.read(), timeoutPromise]);
      const { value, done } = result;

      if (done || !value) {
        throw new Error("Read failed - port closed or no data");
      }

      return new Uint8Array(value);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Closes the underlying serial port.
   *
   * Errors during close are logged but not rethrown.
   */
  async close(): Promise<void> {
    try {
      if (this.port && this.port.readable) {
        await this.port.close();
      }
    } catch (error) {
      console.warn("Error closing serial port:", error);
    }
  }
}
