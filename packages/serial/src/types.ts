/**
 * Shared types for serial port communication.
 */

/** Metadata describing a discovered serial port. */
export interface SerialPortInfo {
  /** Device path or synthetic WebSerial URI. */
  path: string;
  /** Manufacturer string reported by the device, or a placeholder. */
  manufacturer: string;
  /** Unique serial number, or a composite vendor:product string. */
  serialNumber: string;
  /** USB product ID in hex (e.g. `"0x7523"`), or `"N/A"`. */
  productId?: string;
  /** USB vendor ID in hex (e.g. `"0x1a86"`), or `"N/A"`. */
  vendorId?: string;
  /** Plug-and-Play identifier, or `"N/A"`. */
  pnpId?: string;
}

/** Bidirectional serial connection capable of open/close/read/write. */
export interface Connection {
  /** Opens the connection at the given baud rate. Returns `true` on success. */
  open(baudRate?: number): Promise<boolean>;
  /** Closes the connection and releases all resources. */
  close(): Promise<void>;
  /** Writes a buffer to the serial port. */
  write(data: Uint8Array): Promise<void>;
  /**
   * Reads at least `minBytes` from the port, returning whatever has
   * been received before `timeoutMs` elapses.
   */
  readAtLeast(minBytes: number, timeoutMs?: number): Promise<Uint8Array>;
}
