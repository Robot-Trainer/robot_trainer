import { describe, it, expect, vi, beforeEach } from "vitest";
import { SerialPortCoordinator } from "./coordinator";

// ---------------------------------------------------------------------------
// Helpers – build mock SerialPort objects that mimic Web Serial API
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
// SerialPortCoordinator
// ---------------------------------------------------------------------------
describe("SerialPortCoordinator", () => {
  beforeEach(() => {
    SerialPortCoordinator.resetForTesting();
  });

  it("returns the same singleton instance", () => {
    const a = SerialPortCoordinator.getInstance();
    const b = SerialPortCoordinator.getInstance();
    expect(a).toBe(b);
  });

  it("returns a fresh instance after resetForTesting", () => {
    const a = SerialPortCoordinator.getInstance();
    SerialPortCoordinator.resetForTesting();
    const b = SerialPortCoordinator.getInstance();
    expect(a).not.toBe(b);
  });

  it("opens a port and assigns ownership", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort();
    const owner = Symbol("test");

    const result = await coord.open(port, owner, 1000000);
    expect(result).toBe(true);
    expect(port.open).toHaveBeenCalledWith({ baudRate: 1000000 });
  });

  it("returns true when same owner re-opens", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort();
    const owner = Symbol("test");

    await coord.open(port, owner, 1000000);
    const second = await coord.open(port, owner, 1000000);
    expect(second).toBe(true);
    expect(port.open).toHaveBeenCalledTimes(1);
  });

  it("returns false when a different owner tries to open", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort();
    const owner1 = Symbol("owner1");
    const owner2 = Symbol("owner2");

    await coord.open(port, owner1, 1000000);
    const result = await coord.open(port, owner2, 1000000);
    expect(result).toBe(false);
  });

  it("close releases ownership so another owner can open", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort();
    const owner1 = Symbol("owner1");
    const owner2 = Symbol("owner2");

    await coord.open(port, owner1, 1000000);
    await coord.close(port, owner1);

    const result = await coord.open(port, owner2, 1000000);
    expect(result).toBe(true);
  });

  it("close is a no-op for non-owner", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort();
    const owner1 = Symbol("owner1");
    const stranger = Symbol("stranger");

    await coord.open(port, owner1, 1000000);
    await coord.close(port, stranger);

    const result = await coord.open(port, owner1, 1000000);
    expect(result).toBe(true);
  });

  it("close calls port.close() on the physical port", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort();
    const owner = Symbol("test");

    await coord.open(port, owner, 1000000);
    await coord.close(port, owner);
    expect(port.close).toHaveBeenCalled();
  });

  it("withReader works when port is open", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const reader = createMockReader([new Uint8Array([1, 2, 3])]);
    const { port } = createMockPort({
      readable: { getReader: () => reader } as unknown as ReadableStream<Uint8Array>,
    });
    const owner = Symbol("test");

    await coord.open(port, owner, 1000000);

    const data = await coord.withReader(port, owner, async (r) => {
      const chunk = await r.read();
      return chunk.value;
    });

    expect(data).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("withReader throws when port is not open", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort();
    const owner = Symbol("test");

    await expect(
      coord.withReader(port, owner, async () => "data"),
    ).rejects.toThrow("Port is not open for reading");
  });

  it("withWriter works when port is open", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const writer = createMockWriter();
    const { port } = createMockPort({
      writable: { getWriter: () => writer } as unknown as WritableStream<Uint8Array>,
    });
    const owner = Symbol("test");

    await coord.open(port, owner, 1000000);

    await coord.withWriter(port, owner, async (w) => {
      await w.write(new Uint8Array([0xaa]));
    });

    expect(writer.write).toHaveBeenCalledWith(new Uint8Array([0xaa]));
  });

  it("withWriter throws when port is not open", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort();
    const owner = Symbol("test");

    await expect(
      coord.withWriter(port, owner, async () => {
        /* noop */
      }),
    ).rejects.toThrow("Port is not open for writing");
  });

  it("withReader throws when called by non-owner", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort();
    const owner = Symbol("owner");
    const stranger = Symbol("stranger");

    await coord.open(port, owner, 1000000);

    await expect(
      coord.withReader(port, stranger, async () => "data"),
    ).rejects.toThrow("Port is not open for reading");
  });

  it("withWriter throws when called by non-owner", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort();
    const owner = Symbol("owner");
    const stranger = Symbol("stranger");

    await coord.open(port, owner, 1000000);

    await expect(
      coord.withWriter(port, stranger, async () => {
        /* noop */
      }),
    ).rejects.toThrow("Port is not open for writing");
  });

  it("open cleans up on error and rethrows", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort({ openShouldFail: true });
    const owner = Symbol("test");

    await expect(coord.open(port, owner, 1000000)).rejects.toThrow("NetworkError");

    const { port: goodPort } = createMockPort();
    const owner2 = Symbol("test2");
    const result = await coord.open(goodPort, owner2, 1000000);
    expect(result).toBe(true);
  });

  it("open throws when port opens without readable/writable", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort({ readable: null, writable: null });
    (port.open as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      // leave port.readable and port.writable as null
    });
    const owner = Symbol("test");

    await expect(coord.open(port, owner, 1000000)).rejects.toThrow(
      "Serial port opened without readable/writable streams",
    );
  });

  it("skips port.open() when port already has readable/writable", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const reader = createMockReader();
    const writer = createMockWriter();
    const { port } = createMockPort({
      readable: { getReader: () => reader } as unknown as ReadableStream<Uint8Array>,
      writable: { getWriter: () => writer } as unknown as WritableStream<Uint8Array>,
    });
    (port as unknown as Record<string, unknown>).readable = { getReader: () => reader };
    (port as unknown as Record<string, unknown>).writable = { getWriter: () => writer };
    const owner = Symbol("test");

    const result = await coord.open(port, owner, 1000000);
    expect(result).toBe(true);
    expect(port.open).not.toHaveBeenCalled();
  });

  it("open error cleanup handles releaseLock throwing", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const reader = createMockReader();
    (reader.releaseLock as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("lock error");
    });
    const writer = createMockWriter();
    (writer.releaseLock as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("lock error");
    });

    const readable = { getReader: () => reader } as unknown as ReadableStream<Uint8Array>;
    const writable = { getWriter: () => writer } as unknown as WritableStream<Uint8Array>;

    const port = {
      readable: null as ReadableStream<Uint8Array> | null,
      writable: null as WritableStream<Uint8Array> | null,
      open: vi.fn(async () => {
        port.readable = readable;
        port.writable = writable;
        throw new Error("open failed mid-stream");
      }),
      close: vi.fn(),
      getInfo: vi.fn(),
    } as unknown as SerialPort;

    const owner = Symbol("test");
    await expect(coord.open(port, owner, 1000000)).rejects.toThrow("open failed mid-stream");
  });

  it("open cleans up reader when getWriter throws", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const reader = createMockReader();
    const readable = { getReader: () => reader } as unknown as ReadableStream<Uint8Array>;
    const writable = {
      getWriter: () => {
        throw new Error("getWriter failed");
      },
    } as unknown as WritableStream<Uint8Array>;

    const port = {
      readable: null as ReadableStream<Uint8Array> | null,
      writable: null as WritableStream<Uint8Array> | null,
      open: vi.fn(async () => {
        port.readable = readable;
        port.writable = writable;
      }),
      close: vi.fn(),
      getInfo: vi.fn(),
    } as unknown as SerialPort;

    const owner = Symbol("test");
    await expect(coord.open(port, owner, 1000000)).rejects.toThrow("getWriter failed");
    expect(reader.releaseLock).toHaveBeenCalled();
  });

  it("open cleans up reader when getWriter throws and releaseLock also throws", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const reader = createMockReader();
    (reader.releaseLock as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("lock error");
    });
    const readable = { getReader: () => reader } as unknown as ReadableStream<Uint8Array>;
    const writable = {
      getWriter: () => {
        throw new Error("getWriter failed");
      },
    } as unknown as WritableStream<Uint8Array>;

    const port = {
      readable: null as ReadableStream<Uint8Array> | null,
      writable: null as WritableStream<Uint8Array> | null,
      open: vi.fn(async () => {
        port.readable = readable;
        port.writable = writable;
      }),
      close: vi.fn(),
      getInfo: vi.fn(),
    } as unknown as SerialPort;

    const owner = Symbol("test");
    await expect(coord.open(port, owner, 1000000)).rejects.toThrow("getWriter failed");
  });

  it("close handles reader.cancel() and releaseLock() throwing", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const reader = createMockReader();
    (reader.cancel as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("cancel error");
    });
    (reader.releaseLock as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("releaseLock error");
    });
    const writer = createMockWriter();
    (writer.releaseLock as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("releaseLock error");
    });

    const { port } = createMockPort({
      readable: { getReader: () => reader } as unknown as ReadableStream<Uint8Array>,
      writable: { getWriter: () => writer } as unknown as WritableStream<Uint8Array>,
    });
    const owner = Symbol("test");

    await coord.open(port, owner, 1000000);
    await expect(coord.close(port, owner)).resolves.toBeUndefined();
  });

  it("close handles port.close() throwing", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort();
    (port.close as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("close error"));
    const owner = Symbol("test");

    await coord.open(port, owner, 1000000);
    await expect(coord.close(port, owner)).resolves.toBeUndefined();
  });

  it("close is a no-op when port has no state", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const { port } = createMockPort();
    const owner = Symbol("test");

    // Close without ever opening — should not throw
    await expect(coord.close(port, owner)).resolves.toBeUndefined();
  });

  it("throws when both open attempts fail (unrecoverable)", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const port = {
      readable: null,
      writable: null,
      open: vi.fn().mockRejectedValue(new Error("NetworkError")),
      close: vi.fn(),
      getInfo: vi.fn(),
    } as unknown as SerialPort;

    const owner = Symbol("test");
    await expect(coord.open(port, owner, 1000000)).rejects.toThrow("NetworkError");
    expect(port.open).toHaveBeenCalledTimes(2);
    expect(port.close).toHaveBeenCalledTimes(1);
  });

  it("close awaits reader.cancel() before releaseLock()", async () => {
    const coord = SerialPortCoordinator.getInstance();
    const callOrder: string[] = [];
    const reader = createMockReader();
    (reader.cancel as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push("cancel");
    });
    (reader.releaseLock as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callOrder.push("releaseLock");
    });

    const { port } = createMockPort({
      readable: { getReader: () => reader } as unknown as ReadableStream<Uint8Array>,
    });
    const owner = Symbol("test");

    await coord.open(port, owner, 1000000);
    await coord.close(port, owner);

    expect(callOrder).toEqual(["cancel", "releaseLock"]);
  });
});
