import { describe, it, expect, vi, beforeEach } from "vitest";
import { SerialConnection } from "./connection";
import { SerialPortCoordinator } from "./coordinator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createMockReader(chunks: Uint8Array[] = []) {
  let index = 0;
  const reader = {
    read: vi.fn(async () => {
      if (index < chunks.length) {
        return { value: chunks[index++], done: false };
      }
      return { value: undefined, done: true };
    }),
    cancel: vi.fn(),
    releaseLock: vi.fn(),
  };
  return reader as unknown as ReadableStreamDefaultReader<Uint8Array>;
}

function createMockWriter() {
  return {
    write: vi.fn(),
    releaseLock: vi.fn(),
  } as unknown as WritableStreamDefaultWriter<Uint8Array>;
}

function createMockPort(options?: {
  readable?: ReadableStream<Uint8Array> | null;
  writable?: WritableStream<Uint8Array> | null;
  openShouldFail?: boolean;
}) {
  const mockReader = createMockReader();
  const mockWriter = createMockWriter();

  const readable =
    options?.readable !== undefined
      ? options.readable
      : ({ getReader: () => mockReader } as unknown as ReadableStream<Uint8Array>);
  const writable =
    options?.writable !== undefined
      ? options.writable
      : ({ getWriter: () => mockWriter } as unknown as WritableStream<Uint8Array>);

  const port = {
    readable: null as ReadableStream<Uint8Array> | null,
    writable: null as WritableStream<Uint8Array> | null,
    open: vi.fn(async () => {
      if (options?.openShouldFail) {
        throw new Error("NetworkError: Failed to open serial port.");
      }
      port.readable = readable;
      port.writable = writable;
    }),
    close: vi.fn(async () => {
      port.readable = null;
      port.writable = null;
    }),
    getInfo: vi.fn(() => ({ usbVendorId: 0x1234, usbProductId: 0x5678 })),
  } as unknown as SerialPort;

  return { port, mockReader, mockWriter };
}

// ---------------------------------------------------------------------------
// SerialConnection
// ---------------------------------------------------------------------------
describe("SerialConnection", () => {
  beforeEach(() => {
    SerialPortCoordinator.resetForTesting();
  });

  it("open delegates to coordinator and returns true", async () => {
    const { port } = createMockPort();
    const connection = new SerialConnection(port);

    const result = await connection.open(1000000);
    expect(result).toBe(true);
    expect(port.open).toHaveBeenCalledWith({ baudRate: 1000000 });
  });

  it("open returns false when coordinator throws", async () => {
    const { port } = createMockPort({ openShouldFail: true });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const connection = new SerialConnection(port);

    const result = await connection.open();
    expect(result).toBe(false);
    spy.mockRestore();
  });

  it("open uses default baud rate of 1000000", async () => {
    const { port } = createMockPort();
    const connection = new SerialConnection(port);

    await connection.open();
    expect(port.open).toHaveBeenCalledWith({ baudRate: 1000000 });
  });

  it("close delegates to coordinator", async () => {
    const { port } = createMockPort();
    const connection = new SerialConnection(port);

    await connection.open();
    await connection.close();
    expect(port.close).toHaveBeenCalled();
  });

  it("write sends data through the coordinator", async () => {
    const writer = createMockWriter();
    const { port } = createMockPort({
      writable: { getWriter: () => writer } as unknown as WritableStream<Uint8Array>,
    });
    const connection = new SerialConnection(port);

    await connection.open();
    await connection.write(new Uint8Array([0x01, 0x02]));
    expect(writer.write).toHaveBeenCalledWith(new Uint8Array([0x01, 0x02]));
  });

  it("readAtLeast returns data up to minBytes", async () => {
    const reader = createMockReader([
      new Uint8Array([0xaa, 0xbb]),
      new Uint8Array([0xcc]),
    ]);
    const { port } = createMockPort({
      readable: { getReader: () => reader } as unknown as ReadableStream<Uint8Array>,
    });
    const connection = new SerialConnection(port);

    await connection.open();
    const data = await connection.readAtLeast(3, 500);
    expect(data).toEqual(new Uint8Array([0xaa, 0xbb, 0xcc]));
  });

  it("readAtLeast returns partial data on timeout", async () => {
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ value: new Uint8Array([0x01]), done: false })
        .mockImplementation(() => new Promise(() => { /* never resolves */ })),
      cancel: vi.fn(),
      releaseLock: vi.fn(),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;

    const { port } = createMockPort({
      readable: { getReader: () => reader } as unknown as ReadableStream<Uint8Array>,
    });
    const connection = new SerialConnection(port);

    await connection.open();
    const data = await connection.readAtLeast(10, 50);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0]).toBe(0x01);
  });

  it("readAtLeast handles stream closed (done=true)", async () => {
    const reader = {
      read: vi.fn().mockResolvedValue({ value: undefined, done: true }),
      cancel: vi.fn(),
      releaseLock: vi.fn(),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;

    const { port } = createMockPort({
      readable: { getReader: () => reader } as unknown as ReadableStream<Uint8Array>,
    });
    const connection = new SerialConnection(port);

    await connection.open();
    const data = await connection.readAtLeast(5, 100);
    expect(data).toEqual(new Uint8Array(0));
  });

  it("readAtLeast skips chunks with undefined value", async () => {
    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ value: new Uint8Array([0xaa]), done: false })
        .mockResolvedValueOnce({ value: undefined, done: false })
        .mockResolvedValueOnce({ value: new Uint8Array([0xbb]), done: false })
        .mockResolvedValueOnce({ value: undefined, done: true }),
      cancel: vi.fn(),
      releaseLock: vi.fn(),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;

    const { port } = createMockPort({
      readable: { getReader: () => reader } as unknown as ReadableStream<Uint8Array>,
    });
    const connection = new SerialConnection(port);

    await connection.open();
    const data = await connection.readAtLeast(2, 500);
    expect(data).toEqual(new Uint8Array([0xaa, 0xbb]));
  });

  it("two SerialConnections for the same port conflict on ownership", async () => {
    const { port } = createMockPort();
    const connA = new SerialConnection(port);
    const connB = new SerialConnection(port);

    const a = await connA.open();
    const b = await connB.open();

    expect(a).toBe(true);
    expect(b).toBe(false);

    await connA.close();

    const b2 = await connB.open();
    expect(b2).toBe(true);
  });

  it("close then re-open on same connection works", async () => {
    const { port } = createMockPort();
    const connection = new SerialConnection(port);

    await connection.open();
    await connection.close();

    const reopened = await connection.open();
    expect(reopened).toBe(true);
    expect(port.open).toHaveBeenCalledTimes(2);
  });
});
