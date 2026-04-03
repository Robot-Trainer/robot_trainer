import { afterEach, describe, expect, test, vi } from "vitest";
import {
  filterInterestingPorts,
  getWebSerialPorts,
  mapWebSerialPort,
  scanSerialPorts,
} from "./serial_devices";

describe("filterInterestingPorts", () => {
  test("returns true when manufacturer is populated", () => {
    expect(
      filterInterestingPorts({
        path: "webserial://0x1a86/0x7523/0",
        manufacturer: "ACME",
      }),
    ).toBe(true);
  });

  test("returns true when serial number is populated", () => {
    expect(
      filterInterestingPorts({
        path: "webserial://0x1a86/0x7523/0",
        serialNumber: "0x1a86:0x7523",
      }),
    ).toBe(true);
  });

  test("returns false when all identifiers are unavailable", () => {
    expect(
      filterInterestingPorts({
        path: "webserial://unknown-vendor/unknown-product/0",
        manufacturer: "N/A",
        serialNumber: "N/A",
        productId: "N/A",
        vendorId: "N/A",
        pnpId: "N/A",
      }),
    ).toBe(false);
  });
});

describe("Web Serial scanning", () => {
  const makePort = (usbVendorId?: number, usbProductId?: number): SerialPort =>
    ({
      getInfo: () => ({ usbVendorId, usbProductId }),
    }) as SerialPort;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("maps a Web Serial port into SerialPortInfo", () => {
    const info = mapWebSerialPort(makePort(0x1a86, 0x7523), 0);
    expect(info.vendorId).toBe("0x1a86");
    expect(info.productId).toBe("0x7523");
    expect(info.serialNumber).toBe("0x1a86:0x7523");
    expect(info.path).toContain("webserial://0x1a86/0x7523/0");
  });

  test("requests a port when no authorized ports exist", async () => {
    const serialApi: Pick<Serial, "getPorts" | "requestPort"> = {
      getPorts: vi.fn().mockResolvedValue([]),
      requestPort: vi.fn().mockResolvedValue(makePort(0x0403, 0x6001)),
    };

    const ports = await getWebSerialPorts({ requestIfEmpty: true, serialApi });
    expect(serialApi.requestPort).toHaveBeenCalledTimes(1);
    expect(ports).toHaveLength(1);
  });

  test("returns empty when user cancels the requestPort prompt", async () => {
    const serialApi: Pick<Serial, "getPorts" | "requestPort"> = {
      getPorts: vi.fn().mockResolvedValue([]),
      requestPort: vi.fn().mockRejectedValue(new DOMException("cancelled", "NotFoundError")),
    };

    const ports = await getWebSerialPorts({ requestIfEmpty: true, serialApi });
    expect(ports).toEqual([]);
  });

  test("scanSerialPorts maps and filters ports", async () => {
    const serialApi: Pick<Serial, "getPorts" | "requestPort"> = {
      getPorts: vi.fn().mockResolvedValue([
        makePort(0x1a86, 0x7523),
        makePort(undefined, undefined),
      ]),
      requestPort: vi.fn(),
    };

    const ports = await scanSerialPorts({ serialApi });
    expect(ports).toHaveLength(1);
    expect(ports[0].vendorId).toBe("0x1a86");
    expect(ports[0].productId).toBe("0x7523");
  });
});