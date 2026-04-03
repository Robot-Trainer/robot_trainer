import type { SerialPortInfo } from "../types/electron";

const UNKNOWN_VALUE = "N/A";
const UNKNOWN_MANUFACTURER = "Unknown Manufacturer";

const formatUsbId = (value: number | undefined): string | undefined => {
  if (typeof value !== "number") return undefined;
  return `0x${value.toString(16).padStart(4, "0")}`;
};

const buildFallbackPath = (
  portIndex: number,
  vendorId?: string,
  productId?: string,
): string => {
  const vendor = vendorId ?? "unknown-vendor";
  const product = productId ?? "unknown-product";
  return `webserial://${vendor}/${product}/${portIndex}`;
};

const getSerialApi = (
  serialApi?: Pick<Serial, "getPorts" | "requestPort">,
): Pick<Serial, "getPorts" | "requestPort"> | null => {
  if (serialApi) return serialApi;
  if (typeof navigator === "undefined" || !navigator.serial) return null;
  return navigator.serial;
};

const makeStableSerialNumber = (vendorId?: string, productId?: string): string => {
  if (!vendorId && !productId) return UNKNOWN_VALUE;
  return `${vendorId ?? "unknown"}:${productId ?? "unknown"}`;
};

const mapWebSerialPort = (port: SerialPort, index: number): SerialPortInfo => {
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

const filterInterestingPorts = (port: Partial<SerialPortInfo>): boolean => {
  return !!(
    (port.manufacturer && port.manufacturer !== UNKNOWN_VALUE && port.manufacturer !== UNKNOWN_MANUFACTURER) ||
    (port.serialNumber && port.serialNumber !== UNKNOWN_VALUE) ||
    (port.pnpId && port.pnpId !== UNKNOWN_VALUE) ||
    (port.productId && port.productId !== UNKNOWN_VALUE) ||
    (port.vendorId && port.vendorId !== UNKNOWN_VALUE)
  );
};

const getWebSerialPorts = async (
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

const scanSerialPorts = async (
  options: {
    requestIfEmpty?: boolean;
    serialApi?: Pick<Serial, "getPorts" | "requestPort">;
  } = {},
): Promise<SerialPortInfo[]> => {
  const ports = await getWebSerialPorts(options);
  return ports.map((port, index) => mapWebSerialPort(port, index)).filter(filterInterestingPorts);
};

export {
  filterInterestingPorts,
  getWebSerialPorts,
  mapWebSerialPort,
  scanSerialPorts,
};
