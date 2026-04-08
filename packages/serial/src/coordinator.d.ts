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
export declare class SerialPortCoordinator {
    private static instance;
    private readonly stateByPort;
    /** Returns the shared singleton instance, creating it if necessary. */
    static getInstance(): SerialPortCoordinator;
    /** Resets the singleton — intended for use in test suites only. */
    static resetForTesting(): void;
    /** Retrieves (or lazily creates) the internal state for a port. */
    private getState;
    /**
     * Opens a serial port for the given owner at the specified baud rate.
     *
     * @returns `true` if the port is now open for this owner, `false` if
     *          another owner already holds the port.
     * @throws  If the underlying `port.open()` call fails.
     */
    open(port: SerialPort, ownerId: symbol, baudRate: number): Promise<boolean>;
    /**
     * Closes a serial port and releases ownership.
     *
     * No-op if `ownerId` does not currently own the port. Errors thrown
     * during cleanup (cancel, releaseLock, close) are silently caught so
     * that the port state is always fully reset.
     */
    close(port: SerialPort, ownerId: symbol): Promise<void>;
    /**
     * Executes `work` with exclusive access to the port's reader stream.
     *
     * @throws If the port is not open or the caller is not the owner.
     */
    withReader<T>(port: SerialPort, ownerId: symbol, work: (reader: ReadableStreamDefaultReader<Uint8Array>) => Promise<T>): Promise<T>;
    /**
     * Executes `work` with exclusive access to the port's writer stream.
     *
     * @throws If the port is not open or the caller is not the owner.
     */
    withWriter<T>(port: SerialPort, ownerId: symbol, work: (writer: WritableStreamDefaultWriter<Uint8Array>) => Promise<T>): Promise<T>;
}
//# sourceMappingURL=coordinator.d.ts.map