import { afterEach, describe, expect, it, vi } from "vitest";
import {
  filterInterestingPorts,
  formatUsbId,
  getManagedWebSerialPorts,
  getWebSerialPorts,
  mapWebSerialPort,
  scanSerialPorts,
} from "./scanner";
import { SerialConnection } from "./connection";

// ---------------------------------------------------------------------------
// formatUsbId
// ---------------------------------------------------------------------------
describe("formatUsbId", () => {
  it("formats a number as 0x-prefixed, zero-padded hex", () => {
    expect(formatUsbId(0x1a86)).toBe("0x1a86");
  });

  it("zero-pads small values to 4 digits", () => {
    expect(formatUsbId(1)).toBe("0x0001");
  });

  it("returns undefined for undefined input", () => {
    expect(formatUsbId(undefined)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// filterInterestingPorts
// ---------------------------------------------------------------------------
describe("filterInterestingPorts", () => {
  it("returns true when manufacturer is populated", () => {
    expect(
      filterInterestingPorts({
        path: "webserial://0x1a86/0x7523/0",
        manufacturer: "ACME",
      }),
    ).toBe(true);
  });

  it("returns true when serial number is populated", () => {
    expect(
      filterInterestingPorts({
        path: "webserial://0x1a86/0x7523/0",
        serialNumber: "0x1a86:0x7523",
      }),
    ).toBe(true);
  });

  it("returns true when pnpId is populated", () => {
    expect(
      filterInterestingPorts({
        path: "webserial://0x1a86/0x7523/0",
        pnpId: "USB123",
      }),
    ).toBe(true);
  });

  it("returns true when productId is populated", () => {
    expect(
      filterInterestingPorts({
        path: "webserial://0x1a86/0x7523/0",
        productId: "0x7523",
      }),
    ).toBe(true);
  });

  it("returns true when vendorId is populated", () => {
    expect(
      filterInterestingPorts({
        path: "webserial://0x1a86/0x7523/0",
        vendorId: "0x1a86",
      }),
    ).toBe(true);
  });

  it("returns false when all identifiers are unavailable", () => {
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

  it("returns false for Unknown Manufacturer without other identifiers", () => {
    expect(
      filterInterestingPorts({
        path: "webserial://unknown-vendor/unknown-product/0",
        manufacturer: "Unknown Manufacturer",
      }),
    ).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(filterInterestingPorts({})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mapWebSerialPort
// ---------------------------------------------------------------------------
describe("mapWebSerialPort", () => {
  const makePort = (usbVendorId?: number, usbProductId?: number): SerialPort =>
    ({
      getInfo: () => ({ usbVendorId, usbProductId }),
    }) as SerialPort;

  it("maps a Web Serial port into SerialPortInfo", () => {
    const info = mapWebSerialPort(makePort(0x1a86, 0x7523), 0);
    expect(info.vendorId).toBe("0x1a86");
    expect(info.productId).toBe("0x7523");
    expect(info.serialNumber).toBe("0x1a86:0x7523");
    expect(info.path).toContain("webserial://0x1a86/0x7523/0");
  });

  it("handles undefined vendor/product IDs", () => {
    const info = mapWebSerialPort(makePort(undefined, undefined), 2);
    expect(info.vendorId).toBe("N/A");
    expect(info.productId).toBe("N/A");
    expect(info.serialNumber).toBe("N/A");
    expect(info.path).toBe("webserial://unknown-vendor/unknown-product/2");
  });

  it("uses port index in the path", () => {
    const info = mapWebSerialPort(makePort(0x0403, 0x6001), 5);
    expect(info.path).toBe("webserial://0x0403/0x6001/5");
  });

  it("handles vendor only", () => {
    const info = mapWebSerialPort(makePort(0x1234, undefined), 0);
    expect(info.vendorId).toBe("0x1234");
    expect(info.productId).toBe("N/A");
    expect(info.serialNumber).toBe("0x1234:unknown");
  });

  it("handles product only", () => {
    const info = mapWebSerialPort(makePort(undefined, 0x5678), 0);
    expect(info.vendorId).toBe("N/A");
    expect(info.productId).toBe("0x5678");
    expect(info.serialNumber).toBe("unknown:0x5678");
  });
});

// ---------------------------------------------------------------------------
// getWebSerialPorts / scanSerialPorts
// ---------------------------------------------------------------------------
describe("Web Serial scanning", () => {
  const makePort = (usbVendorId?: number, usbProductId?: number): SerialPort =>
    ({
      getInfo: () => ({ usbVendorId, usbProductId }),
    }) as SerialPort;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when Web Serial API is unavailable", async () => {
    await expect(getWebSerialPorts({ serialApi: undefined })).rejects.toThrow(
      "WebSerial API is not available",
    );
  });

  it("returns ports from getPorts without requesting", async () => {
    const serialApi: Pick<Serial, "getPorts" | "requestPort"> = {
      getPorts: vi.fn().mockResolvedValue([makePort(0x1a86, 0x7523)]),
      requestPort: vi.fn(),
    };

    const ports = await getWebSerialPorts({ serialApi });
    expect(ports).toHaveLength(1);
    expect(serialApi.requestPort).not.toHaveBeenCalled();
  });

  it("requests a port when no authorized ports exist", async () => {
    const serialApi: Pick<Serial, "getPorts" | "requestPort"> = {
      getPorts: vi.fn().mockResolvedValue([]),
      requestPort: vi.fn().mockResolvedValue(makePort(0x0403, 0x6001)),
    };

    const ports = await getWebSerialPorts({ requestIfEmpty: true, serialApi });
    expect(serialApi.requestPort).toHaveBeenCalledTimes(1);
    expect(ports).toHaveLength(1);
  });

  it("returns empty when user cancels the requestPort prompt", async () => {
    const serialApi: Pick<Serial, "getPorts" | "requestPort"> = {
      getPorts: vi.fn().mockResolvedValue([]),
      requestPort: vi
        .fn()
        .mockRejectedValue(new DOMException("cancelled", "NotFoundError")),
    };

    const ports = await getWebSerialPorts({ requestIfEmpty: true, serialApi });
    expect(ports).toEqual([]);
  });

  it("returns empty when user aborts the requestPort prompt", async () => {
    const serialApi: Pick<Serial, "getPorts" | "requestPort"> = {
      getPorts: vi.fn().mockResolvedValue([]),
      requestPort: vi
        .fn()
        .mockRejectedValue(new DOMException("aborted", "AbortError")),
    };

    const ports = await getWebSerialPorts({ requestIfEmpty: true, serialApi });
    expect(ports).toEqual([]);
  });

  it("rethrows non-DOMException errors from requestPort", async () => {
    const serialApi: Pick<Serial, "getPorts" | "requestPort"> = {
      getPorts: vi.fn().mockResolvedValue([]),
      requestPort: vi.fn().mockRejectedValue(new Error("unexpected")),
    };

    await expect(
      getWebSerialPorts({ requestIfEmpty: true, serialApi }),
    ).rejects.toThrow("unexpected");
  });

  it("does not request when requestIfEmpty is false", async () => {
    const serialApi: Pick<Serial, "getPorts" | "requestPort"> = {
      getPorts: vi.fn().mockResolvedValue([]),
      requestPort: vi.fn(),
    };

    const ports = await getWebSerialPorts({ serialApi });
    expect(ports).toEqual([]);
    expect(serialApi.requestPort).not.toHaveBeenCalled();
  });

  it("returns managed ports with shared connection objects", async () => {
    const port = makePort(0x1a86, 0x7523);
    const serialApi: Pick<Serial, "getPorts" | "requestPort"> = {
      getPorts: vi.fn().mockResolvedValue([port]),
      requestPort: vi.fn(),
    };

    const ports = await getManagedWebSerialPorts({ serialApi });

    expect(ports).toHaveLength(1);
    expect(ports[0].port).toBe(port);
    expect(ports[0].info.vendorId).toBe("0x1a86");
    expect(ports[0].info.productId).toBe("0x7523");
    expect(ports[0].connection).toBeInstanceOf(SerialConnection);
  });

  it("scanSerialPorts maps and filters ports", async () => {
    const serialApi: Pick<Serial, "getPorts" | "requestPort"> = {
      getPorts: vi
        .fn()
        .mockResolvedValue([makePort(0x1a86, 0x7523), makePort(undefined, undefined)]),
      requestPort: vi.fn(),
    };

    const ports = await scanSerialPorts({ serialApi });
    expect(ports).toHaveLength(1);
    expect(ports[0].vendorId).toBe("0x1a86");
    expect(ports[0].productId).toBe("0x7523");
  });

  it("scanSerialPorts returns empty for no ports", async () => {
    const serialApi: Pick<Serial, "getPorts" | "requestPort"> = {
      getPorts: vi.fn().mockResolvedValue([]),
      requestPort: vi.fn(),
    };

    const ports = await scanSerialPorts({ serialApi });
    expect(ports).toEqual([]);
  });
});
