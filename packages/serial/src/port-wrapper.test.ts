import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebSerialPortWrapper } from "./port-wrapper";
import { SerialPortCoordinator } from "./coordinator";

// ---------------------------------------------------------------------------
// Helpers — mock ports compatible with the coordinator's open() flow
// ---------------------------------------------------------------------------

/** Creates a mock port that is already open (has readable/writable). */
function createOpenMockPort() {
  const mockReader = {
    read: vi.fn().mockResolvedValue({ value: new Uint8Array([1, 2]), done: false }),
    cancel: vi.fn(),
    releaseLock: vi.fn(),
  };
  const mockWriter = {
    write: vi.fn(),
    releaseLock: vi.fn(),
  };

  const port = {
    readable: { getReader: () => mockReader } as unknown as ReadableStream<Uint8Array>,
    writable: { getWriter: () => mockWriter } as unknown as WritableStream<Uint8Array>,
    open: vi.fn(),
    close: vi.fn(async () => {
      port.readable = null as unknown as ReadableStream<Uint8Array>;
      port.writable = null as unknown as WritableStream<Uint8Array>;
    }),
    getInfo: vi.fn(() => ({ usbVendorId: 0x1234, usbProductId: 0x5678 })),
  } as unknown as SerialPort;

  return { port, mockReader, mockWriter };
}

/** Creates a mock port that starts closed and opens on demand. */
function createClosedMockPort() {
  const mockReader = {
    read: vi.fn().mockResolvedValue({ value: new Uint8Array([1, 2]), done: false }),
    cancel: vi.fn(),
    releaseLock: vi.fn(),
  };
  const mockWriter = {
    write: vi.fn(),
    releaseLock: vi.fn(),
  };

  const port = {
    readable: null as ReadableStream<Uint8Array> | null,
    writable: null as WritableStream<Uint8Array> | null,
    open: vi.fn(async () => {
      port.readable = { getReader: () => mockReader } as unknown as ReadableStream<Uint8Array>;
      port.writable = { getWriter: () => mockWriter } as unknown as WritableStream<Uint8Array>;
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
// WebSerialPortWrapper (coordinator-backed)
// ---------------------------------------------------------------------------
describe("WebSerialPortWrapper", () => {
  beforeEach(() => {
    SerialPortCoordinator.resetForTesting();
  });

  // -- isOpen ---------------------------------------------------------------

  it("isOpen returns true when port has readable and writable", () => {
    const { port } = createOpenMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    expect(wrapper.isOpen).toBe(true);
  });

  it("isOpen returns false when port lacks readable", () => {
    const { port } = createClosedMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    expect(wrapper.isOpen).toBe(false);
  });

  // -- initialize -----------------------------------------------------------

  it("initialize succeeds when port is already open", async () => {
    const { port } = createOpenMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    await expect(wrapper.initialize()).resolves.toBeUndefined();
  });

  it("initialize opens a closed port", async () => {
    const { port } = createClosedMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    await wrapper.initialize();
    expect(port.open).toHaveBeenCalledWith({ baudRate: 1_000_000 });
  });

  it("initialize accepts a custom baud rate", async () => {
    const { port } = createClosedMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    await wrapper.initialize(9600);
    expect(port.open).toHaveBeenCalledWith({ baudRate: 9600 });
  });

  it("initialize throws when port is already owned by another wrapper", async () => {
    const { port } = createOpenMockPort();
    const first = new WebSerialPortWrapper(port);
    await first.initialize();

    const second = new WebSerialPortWrapper(port);
    await expect(second.initialize()).rejects.toThrow(
      "Port is already owned by another connection",
    );
  });

  // -- write ----------------------------------------------------------------

  it("write sends data via the coordinator", async () => {
    const { port, mockWriter } = createOpenMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    await wrapper.initialize();

    const data = new Uint8Array([0xaa, 0xbb]);
    await wrapper.write(data);
    expect(mockWriter.write).toHaveBeenCalledWith(data);
  });

  it("write throws when not initialized", async () => {
    const { port } = createOpenMockPort();
    const wrapper = new WebSerialPortWrapper(port);

    await expect(wrapper.write(new Uint8Array([1]))).rejects.toThrow(
      "Port is not open for writing",
    );
  });

  it("write propagates underlying write errors", async () => {
    const { port, mockWriter } = createOpenMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    await wrapper.initialize();

    mockWriter.write.mockRejectedValueOnce(new Error("write error"));
    await expect(wrapper.write(new Uint8Array([1]))).rejects.toThrow("write error");
  });

  // -- read -----------------------------------------------------------------

  it("read returns data from the port", async () => {
    const { port, mockReader } = createOpenMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    await wrapper.initialize();

    mockReader.read.mockResolvedValueOnce({
      value: new Uint8Array([0x01, 0x02]),
      done: false,
    });

    const data = await wrapper.read();
    expect(data).toEqual(new Uint8Array([0x01, 0x02]));
  });

  it("read throws when not initialized", async () => {
    const { port } = createOpenMockPort();
    const wrapper = new WebSerialPortWrapper(port);

    await expect(wrapper.read()).rejects.toThrow("Port is not open for reading");
  });

  it("read throws on timeout", async () => {
    const { port, mockReader } = createOpenMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    await wrapper.initialize();

    mockReader.read.mockImplementation(() => new Promise(() => { /* never resolves */ }));
    await expect(wrapper.read(50)).rejects.toThrow("Read timeout");
  });

  it("read throws when stream reports done", async () => {
    const { port, mockReader } = createOpenMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    await wrapper.initialize();

    mockReader.read.mockResolvedValueOnce({ value: undefined, done: true });
    await expect(wrapper.read()).rejects.toThrow(
      "Read failed - port closed or no data",
    );
  });

  // -- close ----------------------------------------------------------------

  it("close releases ownership via the coordinator", async () => {
    const { port } = createOpenMockPort();
    const wrapper = new WebSerialPortWrapper(port);
    await wrapper.initialize();

    await wrapper.close();
    // Port should have been closed by the coordinator
    expect(port.close).toHaveBeenCalled();
  });

  it("close does not throw when port.close() throws", async () => {
    const { port } = createOpenMockPort();
    (port.close as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("close error"));
    const wrapper = new WebSerialPortWrapper(port);
    await wrapper.initialize();

    await expect(wrapper.close()).resolves.toBeUndefined();
  });

  it("close is safe to call without initialize", async () => {
    const { port } = createOpenMockPort();
    const wrapper = new WebSerialPortWrapper(port);

    await expect(wrapper.close()).resolves.toBeUndefined();
    expect(port.close).not.toHaveBeenCalled();
  });
});
