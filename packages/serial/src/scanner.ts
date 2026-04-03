import { SerialConnection } from "./connection.js";
import type { SerialPortInfo } from "./types.js";

const UNKNOWN_VALUE = "N/A";
const UNKNOWN_MANUFACTURER = "Unknown Manufacturer";

export interface ManagedWebSerialPort {
  port: SerialPort;
  info: SerialPortInfo;
  connection: SerialConnection;
}

/**
 * Formats a numeric USB ID as a zero-padded hex string (e.g. `0x1a86`).
 *
 * @returns The formatted string, or `undefined` when `value` is not a number.
 */
export const formatUsbId = (value: number | undefined): string | undefined => {
  if (typeof value !== "number") return undefined;
  return `0x${value.toString(16).padStart(4, "0")}`;
};

/**
 * Builds a synthetic `webserial://` path for a port that lacks a native
 * filesystem path (as is the case in browsers using the Web Serial API).
 */
const buildFallbackPath = (
  portIndex: number,
  vendorId?: string,
  productId?: string,
): string => {
  const vendor = vendorId ?? "unknown-vendor";
  const product = productId ?? "unknown-product";
  return `webserial://${vendor}/${product}/${portIndex}`;
};

/**
 * Returns the injected or global Web Serial API, or `null` when unavailable.
 */
const getSerialApi = (
  serialApi?: Pick<Serial, "getPorts" | "requestPort">,
): Pick<Serial, "getPorts" | "requestPort"> | null => {
  if (serialApi) return serialApi;
  if (typeof navigator === "undefined" || !navigator.serial) return null;
  return navigator.serial;
};

/**
 * Produces a stable serial-number-like identifier from vendor/product IDs.
 */
const makeStableSerialNumber = (vendorId?: string, productId?: string): string => {
  if (!vendorId && !productId) return UNKNOWN_VALUE;
  return `${vendorId ?? "unknown"}:${productId ?? "unknown"}`;
};

/**
 * Converts a Web Serial `SerialPort` into a {@link SerialPortInfo} record.
 *
 * @param port  - The Web Serial port object.
 * @param index - Positional index used to build the fallback path.
 */
export const mapWebSerialPort = (port: SerialPort, index: number): SerialPortInfo => {
  const info = port.getInfo();
  const vendorId = formatUsbId(info.usbVendorId);
  const productId = formatUsbId(info.usbProductId);

  return {
    path: buildFallbackPath(index, vendorId, productId),
    manufacturer: UNKNOWN_MANUFACTURER,
    serialNumber: makeStableSerialNumber(vendorId, productId),
    productId: productId ?? UNKNOWN_VALUE,
    vendorId: vendorId ?? UNKNOWN_VALUE,
    pnpId: UNKNOWN_VALUE,
  };
};

/**
 * Returns `true` when a port carries at least one meaningful identifier
 * (i.e. not all fields are unknown/placeholder values).
 */
export const filterInterestingPorts = (port: Partial<SerialPortInfo>): boolean => {
  return !!(
    (port.manufacturer && port.manufacturer !== UNKNOWN_VALUE && port.manufacturer !== UNKNOWN_MANUFACTURER) ||
    (port.serialNumber && port.serialNumber !== UNKNOWN_VALUE) ||
    (port.pnpId && port.pnpId !== UNKNOWN_VALUE) ||
    (port.productId && port.productId !== UNKNOWN_VALUE) ||
    (port.vendorId && port.vendorId !== UNKNOWN_VALUE)
  );
};

/**
 * Retrieves the list of authorized Web Serial ports.
 *
 * @param options.requestIfEmpty - When `true`, prompts the user to select a
 *   port if none are already authorized.
 * @param options.serialApi - Optional injectable serial API (for testing).
 * @returns The array of authorized `SerialPort` objects.
 * @throws When the Web Serial API is unavailable.
 */
export const getWebSerialPorts = async (
  options: {
    requestIfEmpty?: boolean;
    serialApi?: Pick<Serial, "getPorts" | "requestPort">;
  } = {},
): Promise<SerialPort[]> => {
  const { requestIfEmpty = false, serialApi } = options;
  const api = getSerialApi(serialApi);

  if (!api) {
    throw new Error("WebSerial API is not available in this browser.");
  }

  let ports = await api.getPorts();

  if (ports.length === 0 && requestIfEmpty) {
    try {
      const selected = await api.requestPort();
      ports = [selected];
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotFoundError" || name === "AbortError") {
        return [];
      }
      throw error;
    }
  }

  return ports;
};

/**
 * Returns authorized Web Serial ports together with their mapped metadata and
 * a coordinator-backed connection for each port.
 *
 * Callers that need to probe devices should use this helper so the discovery
 * phase and follow-up I/O share the same {@link SerialConnection} instance
 * rather than constructing a competing connection later.
 */
export const getManagedWebSerialPorts = async (
  options: {
    requestIfEmpty?: boolean;
    serialApi?: Pick<Serial, "getPorts" | "requestPort">;
  } = {},
): Promise<ManagedWebSerialPort[]> => {
  const ports = await getWebSerialPorts(options);

  return ports.map((port, index) => ({
    port,
    info: mapWebSerialPort(port, index),
    connection: new SerialConnection(port),
  }));
};

/**
 * Scans for connected serial ports and returns metadata for each one
 * that carries at least one meaningful identifier.
 *
 * @param options.requestIfEmpty - Prompt user to select a port when none exist.
 * @param options.serialApi - Optional injectable serial API (for testing).
 */
export const scanSerialPorts = async (
  options: {
    requestIfEmpty?: boolean;
    serialApi?: Pick<Serial, "getPorts" | "requestPort">;
  } = {},
): Promise<SerialPortInfo[]> => {
  const ports = await getWebSerialPorts(options);
  return ports
    .map((port, index) => mapWebSerialPort(port, index))
    .filter(filterInterestingPorts);
};
