/**
 * Web Serial port wrapper backed by the {@link SerialPortCoordinator}.
 *
 * All I/O is mutex-protected through the coordinator so concurrent
 * callers are safely serialized.  Call {@link initialize} before any
 * read/write to register ownership with the coordinator.
 */
export declare class WebSerialPortWrapper {
    private readonly port;
    private readonly ownerId;
    private readonly coordinator;
    constructor(port: SerialPort);
    /** Returns `true` when the underlying port has both readable and writable streams. */
    get isOpen(): boolean;
    /**
     * Opens (or registers) the port with the coordinator.
     *
     * If the port is already open it will be adopted; otherwise it is
     * opened at the given baud rate.
     *
     * @param baudRate - Baud rate to use (default `1_000_000`).
     * @throws If the port is already owned by another connection.
     */
    initialize(baudRate?: number): Promise<void>;
    /**
     * Writes data to the port under the coordinator mutex.
     *
     * @param data - The bytes to send.
     * @throws If the port has not been initialized.
     */
    write(data: Uint8Array): Promise<void>;
    /**
     * Reads a single chunk from the port with a timeout.
     *
     * @param timeout - Maximum time to wait in milliseconds (default `1000`).
     * @returns The received bytes.
     * @throws On timeout, if the port is closed mid-read, or if no data arrives.
     */
    read(timeout?: number): Promise<Uint8Array>;
    /**
     * Closes the port and releases ownership via the coordinator.
     */
    close(): Promise<void>;
}
//# sourceMappingURL=port-wrapper.d.ts.map