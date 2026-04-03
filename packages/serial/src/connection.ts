import type { Connection } from "./types.js";
import { SerialPortCoordinator } from "./coordinator.js";
import { concatUint8 } from "./utils.js";

/**
 * A high-level {@link Connection} backed by the {@link SerialPortCoordinator}.
 *
 * The coordinator ensures that only one logical owner can hold a port at a
 * time and that all I/O is mutex-protected, making this class safe to use
 * from concurrent async contexts.
 */
export class SerialConnection implements Connection {
  private readonly ownerId = Symbol("serial-connection-owner");
  private readonly coordinator = SerialPortCoordinator.getInstance();

  constructor(private readonly port: SerialPort) {}

  /**
   * Opens the serial port at the given baud rate.
   *
   * @param baudRate - Baud rate to use (default `1_000_000`).
   * @returns `true` if the port was opened successfully, `false` otherwise.
   */
  async open(baudRate: number = 1_000_000): Promise<boolean> {
    try {
      return await this.coordinator.open(this.port, this.ownerId, baudRate);
    } catch (error) {
      console.error("Failed to open port:", error);
      return false;
    }
  }

  /** Closes the port and releases ownership. */
  async close(): Promise<void> {
    await this.coordinator.close(this.port, this.ownerId);
  }

  /**
   * Writes data to the serial port.
   *
   * @param buffer - The bytes to send.
   */
  async write(buffer: Uint8Array): Promise<void> {
    await this.coordinator.withWriter(this.port, this.ownerId, async (writer) => {
      await writer.write(buffer);
    });
  }

  /**
   * Reads at least `minBytes` from the port, returning all data received
   * before `timeoutMs` elapses.
   *
   * @param minBytes  - Minimum number of bytes to collect before returning.
   * @param timeoutMs - Maximum time to wait in milliseconds (default `300`).
   * @returns The collected bytes (may be fewer than `minBytes` on timeout).
   */
  async readAtLeast(minBytes: number, timeoutMs = 300): Promise<Uint8Array> {
    return this.coordinator.withReader(this.port, this.ownerId, async (reader) => {
      let chunks: Uint8Array = new Uint8Array(0);
      const deadline = Date.now() + timeoutMs;

      while (chunks.length < minBytes && Date.now() < deadline) {
        const timeoutPromise = new Promise<{ value: undefined; done: true }>((resolve) => {
          setTimeout(
            () => resolve({ value: undefined, done: true }),
            Math.max(1, deadline - Date.now()),
          );
        });

        const result = await Promise.race([reader.read(), timeoutPromise]);

        if (result.done) {
          break;
        }

        if (result.value) {
          chunks = concatUint8(chunks, new Uint8Array(result.value));
        }
      }

      return new Uint8Array(chunks);
    });
  }
}
