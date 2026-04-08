import { SerialPortCoordinator } from "./coordinator.js";

/**
 * Web Serial port wrapper backed by the {@link SerialPortCoordinator}.
 *
 * All I/O is mutex-protected through the coordinator so concurrent
 * callers are safely serialized.  Call {@link initialize} before any
 * read/write to register ownership with the coordinator.
 */
export class WebSerialPortWrapper {
  private readonly port: SerialPort;
  private readonly ownerId = Symbol("port-wrapper-owner");
  private readonly coordinator = SerialPortCoordinator.getInstance();

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
   * Opens (or registers) the port with the coordinator.
   *
   * If the port is already open it will be adopted; otherwise it is
   * opened at the given baud rate.
   *
   * @param baudRate - Baud rate to use (default `1_000_000`).
   * @throws If the port is already owned by another connection.
   */
  async initialize(baudRate: number = 1_000_000): Promise<void> {
    const opened = await this.coordinator.open(this.port, this.ownerId, baudRate);
    if (!opened) {
      throw new Error("Port is already owned by another connection");
    }
  }

  /**
   * Writes data to the port under the coordinator mutex.
   *
   * @param data - The bytes to send.
   * @throws If the port has not been initialized.
   */
  async write(data: Uint8Array): Promise<void> {
    await this.coordinator.withWriter(this.port, this.ownerId, async (writer) => {
      await writer.write(data);
    });
  }

  /**
   * Reads a single chunk from the port with a timeout.
   *
   * @param timeout - Maximum time to wait in milliseconds (default `1000`).
   * @returns The received bytes.
   * @throws On timeout, if the port is closed mid-read, or if no data arrives.
   */
  async read(timeout: number = 1000): Promise<Uint8Array> {
    return this.coordinator.withReader(this.port, this.ownerId, async (reader) => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Read timeout")), timeout);
      });

      const result = await Promise.race([reader.read(), timeoutPromise]);
      const { value, done } = result;

      if (done || !value) {
        throw new Error("Read failed - port closed or no data");
      }

      return new Uint8Array(value);
    });
  }

  /**
   * Closes the port and releases ownership via the coordinator.
   */
  async close(): Promise<void> {
    await this.coordinator.close(this.port, this.ownerId);
  }
}
