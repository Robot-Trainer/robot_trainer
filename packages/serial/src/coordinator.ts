import { AsyncMutex } from "./mutex.js";

/**
 * Internal state tracked per physical `SerialPort` by the coordinator.
 */
export type SharedPortState = {
  owner: symbol | null;
  baudRate: number | null;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
  writer: WritableStreamDefaultWriter<Uint8Array> | null;
  mutex: AsyncMutex;
};

/**
 * Singleton that manages exclusive ownership of Web Serial ports.
 *
 * Only one logical owner (identified by a unique `Symbol`) can hold a
 * port at a time.  All read/write access is mutex-protected so that
 * concurrent callers are safely serialized.
 */
export class SerialPortCoordinator {
  private static instance: SerialPortCoordinator | null = null;
  private readonly stateByPort = new WeakMap<SerialPort, SharedPortState>();

  /** Returns the shared singleton instance, creating it if necessary. */
  static getInstance(): SerialPortCoordinator {
    if (!SerialPortCoordinator.instance) {
      SerialPortCoordinator.instance = new SerialPortCoordinator();
    }
    return SerialPortCoordinator.instance;
  }

  /** Resets the singleton — intended for use in test suites only. */
  static resetForTesting(): void {
    SerialPortCoordinator.instance = null;
  }

  /** Retrieves (or lazily creates) the internal state for a port. */
  private getState(port: SerialPort): SharedPortState {
    let state = this.stateByPort.get(port);
    if (!state) {
      state = {
        owner: null,
        baudRate: null,
        reader: null,
        writer: null,
        mutex: new AsyncMutex(),
      };
      this.stateByPort.set(port, state);
    }
    return state;
  }

  /**
   * Opens a serial port for the given owner at the specified baud rate.
   *
   * @returns `true` if the port is now open for this owner, `false` if
   *          another owner already holds the port.
   * @throws  If the underlying `port.open()` call fails.
   */
  async open(port: SerialPort, ownerId: symbol, baudRate: number): Promise<boolean> {
    const state = this.getState(port);

    return state.mutex.runExclusive(async () => {
      if (state.owner && state.owner !== ownerId) {
        return false;
      }

      if (state.owner === ownerId && state.reader && state.writer) {
        return true;
      }

      try {
        if (!port.readable || !port.writable) {
          try {
            await port.open({ baudRate });
          } catch {
            // Port may be stuck open from a previous incomplete close.
            // Force-close at the OS level and retry once.
            try { await port.close(); } catch { /* ignore */ }
            await port.open({ baudRate });
          }
        }

        if (!port.readable || !port.writable) {
          throw new Error("Serial port opened without readable/writable streams");
        }

        state.reader = port.readable.getReader();
        state.writer = port.writable.getWriter();
        state.owner = ownerId;
        state.baudRate = baudRate;
        return true;
      } catch (error) {
        if (state.reader) {
          try {
            state.reader.releaseLock();
          } catch {
            // Ignore cleanup errors
          }
          state.reader = null;
        }
        if (state.writer) {
          try {
            state.writer.releaseLock();
          } catch {
            // Ignore cleanup errors
          }
          state.writer = null;
        }
        if (state.owner === ownerId) {
          state.owner = null;
          state.baudRate = null;
        }
        throw error;
      }
    });
  }

  /**
   * Closes a serial port and releases ownership.
   *
   * No-op if `ownerId` does not currently own the port. Errors thrown
   * during cleanup (cancel, releaseLock, close) are silently caught so
   * that the port state is always fully reset.
   */
  async close(port: SerialPort, ownerId: symbol): Promise<void> {
    const state = this.getState(port);

    await state.mutex.runExclusive(async () => {
      if (state.owner !== ownerId) {
        return;
      }

      if (state.reader) {
        try {
          await state.reader.cancel();
        } catch {
          // Ignore
        }
        try {
          state.reader.releaseLock();
        } catch {
          // Ignore
        }
        state.reader = null;
      }

      if (state.writer) {
        try {
          state.writer.releaseLock();
        } catch {
          // Ignore
        }
        state.writer = null;
      }

      state.owner = null;
      state.baudRate = null;

      if (port.readable || port.writable) {
        try {
          await port.close();
        } catch {
          // Ignore
        }
      }
    });
  }

  /**
   * Executes `work` with exclusive access to the port's reader stream.
   *
   * @throws If the port is not open or the caller is not the owner.
   */
  async withReader<T>(
    port: SerialPort,
    ownerId: symbol,
    work: (reader: ReadableStreamDefaultReader<Uint8Array>) => Promise<T>,
  ): Promise<T> {
    const state = this.getState(port);
    return state.mutex.runExclusive(async () => {
      if (state.owner !== ownerId || !state.reader) {
        throw new Error("Port is not open for reading");
      }
      return work(state.reader);
    });
  }

  /**
   * Executes `work` with exclusive access to the port's writer stream.
   *
   * @throws If the port is not open or the caller is not the owner.
   */
  async withWriter<T>(
    port: SerialPort,
    ownerId: symbol,
    work: (writer: WritableStreamDefaultWriter<Uint8Array>) => Promise<T>,
  ): Promise<T> {
    const state = this.getState(port);
    return state.mutex.runExclusive(async () => {
      if (state.owner !== ownerId || !state.writer) {
        throw new Error("Port is not open for writing");
      }
      return work(state.writer);
    });
  }
}
