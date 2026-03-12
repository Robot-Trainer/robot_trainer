import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CameraDiscovery, type CameraEntry } from "./CameraDiscovery";

type MockTrack = { stop: ReturnType<typeof vi.fn> };
type MockStream = MediaStream & {
  clone: ReturnType<typeof vi.fn>;
  _tracks: MockTrack[];
};

const createStream = (trackCount = 1): MockStream => {
  const tracks = Array.from({ length: trackCount }, () => ({ stop: vi.fn() }));
  const stream = {
    getTracks: () => tracks,
    clone: vi.fn(),
    _tracks: tracks,
  } as unknown as MockStream;
  stream.clone.mockImplementation(() => createStream(trackCount));
  return stream;
};

const createVideoDevice = (deviceId: string, label = "") =>
  ({ kind: "videoinput", deviceId, label }) as MediaDeviceInfo;

const createAudioDevice = (deviceId: string, label = "") =>
  ({ kind: "audioinput", deviceId, label }) as MediaDeviceInfo;

describe("CameraDiscovery", () => {
  const onAdd = vi.fn();
  const onRemove = vi.fn();
  const enumerateDevices = vi.fn();
  const getUserMedia = vi.fn();
  const queryPermission = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices,
        getUserMedia,
      },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: {
        query: queryPermission,
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return (this as unknown as Record<string, unknown>).__srcObject ?? null;
      },
      set(value) {
        (this as unknown as Record<string, unknown>).__srcObject = value;
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("discovers cameras, auto-previews first device, and adds a camera", async () => {
    const previewStream = createStream();
    const clonedStream = createStream();
    previewStream.clone.mockReturnValue(clonedStream);
    queryPermission.mockResolvedValue({ state: "granted" });
    enumerateDevices.mockResolvedValue([
      createAudioDevice("audio-1", "Mic"),
      createVideoDevice("cam-1", "Front Camera"),
      createVideoDevice("cam-2", "Rear Camera"),
    ]);
    getUserMedia.mockResolvedValue(previewStream);

    render(<CameraDiscovery cameras={[]} onAdd={onAdd} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: /detect cameras/i }));

    await waitFor(() => {
      expect(enumerateDevices).toHaveBeenCalled();
      expect(getUserMedia).toHaveBeenCalledWith({
        video: {
          deviceId: { exact: "cam-1" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    });

    expect(screen.getByText("Live Preview")).toBeTruthy();
    const nameInput = screen.getByLabelText("Camera Name");
    fireEvent.change(nameInput, { target: { value: "  overhead  " } });
    fireEvent.click(screen.getByRole("button", { name: /add camera/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        name: "overhead",
        deviceId: "cam-1",
        deviceLabel: "Front Camera",
        stream: clonedStream,
      });
    });
    expect((nameInput as HTMLInputElement).value).toBe("");
  });

  it("requests temporary permission when labels are hidden and uses fallback label", async () => {
    const tempPermissionStream = createStream();
    const previewStream = createStream();
    queryPermission.mockRejectedValue(new Error("unsupported"));
    enumerateDevices
      .mockResolvedValueOnce([
        createVideoDevice("cam-a", ""),
        createVideoDevice("cam-b", ""),
      ])
      .mockResolvedValueOnce([
        createVideoDevice("cam-a", ""),
        createVideoDevice("cam-b", ""),
      ]);
    getUserMedia
      .mockResolvedValueOnce(tempPermissionStream)
      .mockResolvedValueOnce(previewStream);

    render(<CameraDiscovery cameras={[]} onAdd={onAdd} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: /detect cameras/i }));

    await waitFor(() => {
      expect(getUserMedia).toHaveBeenNthCalledWith(1, { video: true });
      expect(tempPermissionStream._tracks[0].stop).toHaveBeenCalled();
      expect(getUserMedia).toHaveBeenNthCalledWith(2, {
        video: {
          deviceId: { exact: "cam-a" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    });

    fireEvent.change(screen.getByLabelText("Camera Name"), {
      target: { value: "secondary" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add camera/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceLabel: "Camera cam-a...",
        }),
      );
    });
  });

  it("shows validation errors for missing name and duplicate name", async () => {
    const previewStream = createStream();
    queryPermission.mockResolvedValue({ state: "granted" });
    enumerateDevices.mockResolvedValue([
      createVideoDevice("cam-1", "Main Camera"),
    ]);
    getUserMedia.mockResolvedValue(previewStream);

    const existingCamera: CameraEntry = {
      name: "main",
      deviceId: "existing",
      deviceLabel: "Existing Device",
      stream: createStream(),
    };
    render(
      <CameraDiscovery
        cameras={[existingCamera]}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /detect cameras/i }));

    await waitFor(() => {
      expect(screen.getByText("Live Preview")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /add camera/i }));
    expect(screen.getByText("Please enter a camera name")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Camera Name"), {
      target: { value: "main" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add camera/i }));
    expect(
      screen.getByText('A camera named "main" already exists'),
    ).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("switches preview camera from selector and stops previous stream tracks", async () => {
    const firstStream = createStream(2);
    const secondStream = createStream(1);
    queryPermission.mockResolvedValue({ state: "granted" });
    enumerateDevices.mockResolvedValue([
      createVideoDevice("cam-1", "Camera One"),
      createVideoDevice("cam-2", "Camera Two"),
    ]);
    getUserMedia
      .mockResolvedValueOnce(firstStream)
      .mockResolvedValueOnce(secondStream);

    render(<CameraDiscovery cameras={[]} onAdd={onAdd} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: /detect cameras/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("Select Camera Device")).toBeTruthy();
    });

    fireEvent.mouseDown(screen.getByLabelText("Select Camera Device"));
    fireEvent.click(await screen.findByRole("option", { name: "Camera Two" }));

    await waitFor(() => {
      expect(firstStream._tracks[0].stop).toHaveBeenCalled();
      expect(firstStream._tracks[1].stop).toHaveBeenCalled();
      expect(getUserMedia).toHaveBeenLastCalledWith({
        video: {
          deviceId: { exact: "cam-2" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    });
  });

  it("renders added camera cards, removes a camera, and handles discovery failures", async () => {
    const addedStream = createStream();
    const camera: CameraEntry = {
      name: "wrist",
      deviceId: "cam-x",
      deviceLabel: "Wrist Camera",
      stream: addedStream,
    };
    queryPermission.mockResolvedValue({ state: "granted" });
    enumerateDevices.mockRejectedValue(new Error("No permission"));

    render(
      <CameraDiscovery cameras={[camera]} onAdd={onAdd} onRemove={onRemove} />,
    );

    expect(screen.getByText("Added Cameras (1)")).toBeTruthy();
    expect(screen.getByText("wrist")).toBeTruthy();
    fireEvent.click(screen.getByTestId("DeleteIcon").closest("button")!);

    expect(addedStream._tracks[0].stop).toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalledWith("wrist");

    fireEvent.click(screen.getByRole("button", { name: /detect cameras/i }));

    await waitFor(() => {
      expect(screen.getByText("No permission")).toBeTruthy();
      expect(
        screen.getByText(
          "Camera permission denied. Please allow camera access in your browser settings.",
        ),
      ).toBeTruthy();
    });
  });
});
