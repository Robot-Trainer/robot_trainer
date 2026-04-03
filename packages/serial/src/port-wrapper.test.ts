import { describe, it, expect, vi } from "vitest";
import { WebSerialPortWrapper } from "./port-wrapper";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createMockPort(options?: {
  readable?: ReadableStream<Uint8Array> | null;
  writable?: WritableStream<Uint8Array> | null;
}) {
  const mockReader = {
    read: vi.fn().mockResolvedValue({ value: new Uint8Array([1, 2]), done: false }),
    releaseLock: vi.fn(),
  };
  const mockWriter = {
    write: vi.fn(),
    releaseLock: vi.fn(),
  };

  const readable =
    options?.readable !== undefined
      ? options.readable
      : ({ getReader: () => mockReader } as unknown as ReadableStream<Uint8Array>);
  const writable =
    options?.writable !== undefined
      ? options.writable
      : ({ getWriter: () => mockWriter } as unknown as WritableStream<Uint8Array>);

  const port = {
    readable,
    writable,
    open: vi.fn(),
    close: vi.fn(),
    getInfo: vi.fn(() => ({ usbVendorId: 0x1234, usbProductId: 0x5678 })),
  } as unknown as SerialPort;

  return { port, mockReader, mockWriter };
}

// ---------------------------------------------------------------------------
// WebSerialPortWrapper
// ---------------------------------------------------------------------------
describe("WebSerialPortWrapper", () => {
  it("isOpen returns true when port has readable and writable", () => {
    const { port } = createMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    expect(wrapper.isOpen).toBe(true);
  });

  it("isOpen returns false when port lacks readable", () => {
    const { port } = createMockPort({ readable: null });
    const wrapper = new WebSerialPortWrapper(port);
    expect(wrapper.isOpen).toBe(false);
  });

  it("isOpen returns false when port lacks writable", () => {
    const { port } = createMockPort({ writable: null });
    const wrapper = new WebSerialPortWrapper(port);
    expect(wrapper.isOpen).toBe(false);
  });

  it("initialize succeeds when port is ready", async () => {
    const { port } = createMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    await expect(wrapper.initialize()).resolves.toBeUndefined();
  });

  it("initialize throws when port is not ready", async () => {
    const { port } = createMockPort({ readable: null, writable: null });
    const wrapper = new WebSerialPortWrapper(port);
    await expect(wrapper.initialize()).rejects.toThrow(
      "Port is not open for reading/writing",
    );
  });

  it("write sends data and releases lock", async () => {
    const { port, mockWriter } = createMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    const data = new Uint8Array([0xaa, 0xbb]);

    await wrapper.write(data);
    expect(mockWriter.write).toHaveBeenCalledWith(data);
    expect(mockWriter.releaseLock).toHaveBeenCalled();
  });

  it("write throws when port is not open for writing", async () => {
    const { port } = createMockPort({ writable: null });
    const wrapper = new WebSerialPortWrapper(port);

    await expect(wrapper.write(new Uint8Array([1]))).rejects.toThrow(
      "Port not open for writing",
    );
  });

  it("write releases lock even on error", async () => {
    const mockWriter = {
      write: vi.fn().mockRejectedValue(new Error("write error")),
      releaseLock: vi.fn(),
    };
    const port = {
      readable: {} as ReadableStream<Uint8Array>,
      writable: { getWriter: () => mockWriter } as unknown as WritableStream<Uint8Array>,
    } as unknown as SerialPort;

    const wrapper = new WebSerialPortWrapper(port);
    await expect(wrapper.write(new Uint8Array([1]))).rejects.toThrow("write error");
    expect(mockWriter.releaseLock).toHaveBeenCalled();
  });

  it("read returns data from the port", async () => {
    const { port, mockReader } = createMockPort();
    mockReader.read.mockResolvedValue({
      value: new Uint8Array([0x01, 0x02]),
      done: false,
    });
    const wrapper = new WebSerialPortWrapper(port);

    const data = await wrapper.read();
    expect(data).toEqual(new Uint8Array([0x01, 0x02]));
    expect(mockReader.releaseLock).toHaveBeenCalled();
  });

  it("read throws when port is not open for reading", async () => {
    const { port } = createMockPort({ readable: null });
    const wrapper = new WebSerialPortWrapper(port);

    await expect(wrapper.read()).rejects.toThrow("Port not open for reading");
  });

  it("read throws on timeout", async () => {
    const mockReader = {
      read: vi.fn().mockImplementation(() => new Promise(() => { /* never resolves */ })),
      releaseLock: vi.fn(),
    };
    const port = {
      readable: { getReader: () => mockReader } as unknown as ReadableStream<Uint8Array>,
      writable: {} as WritableStream<Uint8Array>,
    } as unknown as SerialPort;

    const wrapper = new WebSerialPortWrapper(port);
    await expect(wrapper.read(50)).rejects.toThrow("Read timeout");
    expect(mockReader.releaseLock).toHaveBeenCalled();
  });

  it("read throws when stream reports done", async () => {
    const mockReader = {
      read: vi.fn().mockResolvedValue({ value: undefined, done: true }),
      releaseLock: vi.fn(),
    };
    const port = {
      readable: { getReader: () => mockReader } as unknown as ReadableStream<Uint8Array>,
      writable: {} as WritableStream<Uint8Array>,
    } as unknown as SerialPort;

    const wrapper = new WebSerialPortWrapper(port);
    await expect(wrapper.read()).rejects.toThrow(
      "Read failed - port closed or no data",
    );
  });

  it("close calls port.close()", async () => {
    const { port } = createMockPort();
    const wrapper = new WebSerialPortWrapper(port);

    await wrapper.close();
    expect(port.close).toHaveBeenCalled();
  });

  it("close does not throw when port.close() throws", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { port } = createMockPort();
    (port.close as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("close error"));
    const wrapper = new WebSerialPortWrapper(port);

    await expect(wrapper.close()).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it("close is a no-op when port lacks readable", async () => {
    const { port } = createMockPort({ readable: null });
    const wrapper = new WebSerialPortWrapper(port);

    await expect(wrapper.close()).resolves.toBeUndefined();
    expect(port.close).not.toHaveBeenCalled();
  });
});
