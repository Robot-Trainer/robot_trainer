import React from 'react';
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RobotForm from './RobotForm';
import { robotModelsResource } from '../db/resources';

vi.mock('../db/db', () => {
  const mockLimit = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  return {
    db: { select: mockSelect },
    __mockSelect: mockSelect,
    __mockLimit: mockLimit,
  };
});

// Mock the resources
vi.mock('../db/resources', () => ({
  robotModelsResource: {
    list: vi.fn(),
  },
}));

// Mock the robot detectors module
const mockDetect = vi.fn().mockResolvedValue(null);
vi.mock('../lib/robot_detectors', () => ({
  RobotDetectorManager: class {
    detect = mockDetect;
  },
  SerialConnection: class {
    constructor() { /* noop */ }
  },
}));

// Mock Monaco Editor (heavy dependency, not needed for form logic tests)
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: Record<string, unknown>) => (
    <textarea
      data-testid="monaco-editor"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

// Mock MujocoPreview (Three.js/WebGL not available in jsdom)
vi.mock('../ui/MujocoPreview', () => ({
  default: ({ xml, onError, onSuccess }: Record<string, unknown>) => (
    <div data-testid="mujoco-preview" data-xml={xml || ''}>
      <button data-testid="mujoco-trigger-error" onClick={() => (onError as (s: string) => void)?.('test error')} />
      <button data-testid="mujoco-trigger-success" onClick={() => (onSuccess as () => void)?.()} />
    </div>
  ),
  MujocoPreview: ({ xml, onError, onSuccess }: Record<string, unknown>) => (
    <div data-testid="mujoco-preview" data-xml={xml || ''}>
      <button data-testid="mujoco-trigger-error" onClick={() => (onError as (s: string) => void)?.('test error')} />
      <button data-testid="mujoco-trigger-success" onClick={() => (onSuccess as () => void)?.()} />
    </div>
  ),
}));

// Mock CameraDiscovery (navigator.mediaDevices not available in jsdom)
vi.mock('../ui/CameraDiscovery', () => ({
  default: ({ cameras, onAdd, onRemove }: Record<string, unknown>) => (
    <div data-testid="camera-discovery">
      {(cameras as Array<Record<string, unknown>>)?.map((c) => (
        <div key={c.name as string} data-testid={`camera-${c.name}`}>{c.name as string}</div>
      ))}
      <button data-testid="camera-add" onClick={() => (onAdd as (c: unknown) => void)?.({
        name: 'Test Camera',
        deviceId: 'cam-001',
        deviceLabel: 'USB Camera serial:ABC123',
        stream: null,
      })} />
      <button data-testid="camera-remove" onClick={() => (onRemove as (n: string) => void)?.('Test Camera')} />
    </div>
  ),
  CameraDiscovery: ({ cameras, onAdd, onRemove }: Record<string, unknown>) => (
    <div data-testid="camera-discovery">
      {(cameras as Array<Record<string, unknown>>)?.map((c) => (
        <div key={c.name as string} data-testid={`camera-${c.name}`}>{c.name as string}</div>
      ))}
      <button data-testid="camera-add" onClick={() => (onAdd as (c: unknown) => void)?.({
        name: 'Test Camera',
        deviceId: 'cam-001',
        deviceLabel: 'USB Camera serial:ABC123',
        stream: null,
      })} />
      <button data-testid="camera-remove" onClick={() => (onRemove as (n: string) => void)?.('Test Camera')} />
    </div>
  ),
}));

// Mock CalibrationDialog
vi.mock('../ui/CalibrationDialog', () => ({
  CalibrationDialog: ({ open, onClose, onSave }: Record<string, unknown>) => (
    open ? (
      <div data-testid="calibration-dialog">
        <button data-testid="calibration-close" onClick={onClose as () => void} />
        <button data-testid="calibration-save" onClick={() => (onSave as (r: Record<string, unknown>) => void)?.({ motor1: 0, motor2: 1 })} />
      </div>
    ) : null
  ),
}));

describe('RobotForm', () => {
  const mockOnSaved = vi.fn();
  const mockOnCancel = vi.fn();

  const mockRobotModels = [
    {
      id: 1,
      name: 'Robot Model A',
      dirName: 'robot_model_a',
      supportedModalities: ['real'],
      simProperties: {},
      realProperties: {},
      teleoperator: false,
    },
    {
      id: 2,
      name: 'Robot Model B',
      dirName: 'robot_model_b',
      supportedModalities: ['simulated'],
      simProperties: {
        xml_string: '<mujoco><worldbody><geom type="box" size="0.1"/></worldbody></mujoco>',
      },
      realProperties: {},
      teleoperator: false,
    },
    {
      id: 3,
      name: 'Robot Model C',
      dirName: 'robot_model_c',
      supportedModalities: ['real', 'simulated'],
      simProperties: {
        xml_string: '<mujoco><worldbody><geom type="sphere" size="0.2"/></worldbody></mujoco>',
      },
      realProperties: {},
      teleoperator: false,
    },
    {
      id: 69,
      name: 'Phone',
      dirName: 'phone',
      supportedModalities: [],
      simProperties: {},
      realProperties: {},
      teleoperator: true,
    },
    {
      id: 70,
      name: 'Keyboard',
      dirName: 'keyboard',
      supportedModalities: [],
      simProperties: {},
      realProperties: {},
      teleoperator: true,
    },
  ];

  // Mock WebSerial port objects
  const mockWebSerialPort1 = {
    getInfo: () => ({ usbVendorId: 0x1a86, usbProductId: 0x7523 }),
    open: vi.fn(),
    close: vi.fn(),
    readable: null,
    writable: null,
  } as unknown as SerialPort;

  const mockWebSerialPort2 = {
    getInfo: () => ({ usbVendorId: 0x0403, usbProductId: 0x6001 }),
    open: vi.fn(),
    close: vi.fn(),
    readable: null,
    writable: null,
  } as unknown as SerialPort;

  const mockGetPorts = vi.fn().mockResolvedValue([mockWebSerialPort1, mockWebSerialPort2]);
  const mockRequestPort = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (robotModelsResource.list as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockRobotModels);
    mockDetect.mockResolvedValue(null);
    mockGetPorts.mockResolvedValue([mockWebSerialPort1, mockWebSerialPort2]);
    mockRequestPort.mockReset();

    // Mock navigator.serial (WebSerial API)
    Object.defineProperty(navigator, 'serial', {
      value: {
        getPorts: mockGetPorts,
        requestPort: mockRequestPort,
      },
      writable: true,
      configurable: true,
    });

    // Mock electronAPI (still needed for non-serial operations)
    (global as unknown as Record<string, unknown>).window.electronAPI = {
      selectModelFile: vi.fn().mockResolvedValue(null),
      selectModelFolder: vi.fn().mockResolvedValue(null),
      readModelFile: vi.fn().mockResolvedValue({
        content: '<mujoco/>',
        format: 'mjcf',
        baseName: 'custom_model',
        metadata: { numJoints: 0, jointNames: [], actuatorNames: [], siteNames: [], hasGripper: false },
      }),
      selectDirectory: vi.fn().mockResolvedValue(null),
      writeJsonFile: vi.fn().mockResolvedValue(true),
      getDefaultCalibrationRoot: vi.fn().mockResolvedValue('/tmp/calibration'),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('loads robot models and saves real robot with realProperties', async () => {
    render(<RobotForm onSaved={mockOnSaved} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Auto-scan fires on mount for new robots – wait for ports to appear
    await waitFor(() => {
      expect(mockGetPorts).toHaveBeenCalled();
      const deviceElements = screen.getAllByText(/Device 1/);
      expect(deviceElements.length).toBeGreaterThan(0);
    });

    // Select Robot Model A (real)
    const modelSelectTrigger = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelectTrigger);
    const modelOption = await screen.findByRole('option', { name: /Robot Model A/i });
    fireEvent.click(modelOption);

    // Click device in left panel – this also collapses the panel and auto-populates name
    const deviceCard = await screen.findByRole('button', { name: /Select device 1/i });
    fireEvent.click(deviceCard);

    // Override auto-populated name after device selection
    await waitFor(() => {
      expect(screen.getByLabelText(/Robot Name/i)).toBeTruthy();
    });
    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'My Test Robot' } });

    // Save
    const saveBtn = screen.getByText(/Save Robot/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: 'My Test Robot',
        robotModelId: 1,
        modality: 'real',
        serialNumber: '0x1a86:0x7523',
        realProperties: expect.objectContaining({
          config: expect.objectContaining({
            disable_torque_on_disconnect: true,
            use_degrees: false,
          }),
        }),
        simProperties: {},
      }));
    });
  });

  it('shows modality badges in robot model dropdown', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);

    const realOption = await screen.findByRole('option', { name: /Robot Model A/i });
    expect(realOption.textContent).toContain('real');

    const simOption = await screen.findByRole('option', { name: /Robot Model B/i });
    expect(simOption.textContent).toContain('simulated');
  });

  it('shows both modality badges for multi-modality robot models', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);

    const multiOption = await screen.findByRole('option', { name: /Robot Model C/i });
    expect(multiOption.textContent).toContain('real');
    expect(multiOption.textContent).toContain('simulated');
  });

  it('saves simulated robot with simProperties.xml_string', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'Sim Robot' } });

    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const modelOption = await screen.findByRole('option', { name: /Robot Model B/i });
    fireEvent.click(modelOption);

    expect(screen.queryByText(/Real Robot Configuration/i)).toBeNull();

    const saveBtn = screen.getByText(/Save Robot/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Sim Robot',
        modality: 'simulated',
        serialNumber: '',
        robotModelId: 2,
        simProperties: expect.objectContaining({
          xml_string: mockRobotModels[1].simProperties.xml_string,
        }),
        realProperties: {},
      }));
    });
  });

  it('shows monaco editor and 3D preview when editing a simulated robot', async () => {
    const simRobotData = {
      id: 10,
      name: 'My Sim Bot',
      modality: 'simulated',
      robotModelId: 2,
      data: { type: 'simulation' },
      simProperties: {
        xml_string: '<mujoco><worldbody><geom type="sphere" size="0.1"/></worldbody></mujoco>',
      },
      realProperties: {},
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={simRobotData} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeTruthy();

    const preview = screen.getByTestId('mujoco-preview');
    expect(preview).toBeTruthy();
  });

  it('shows camera discovery when modality is real', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    const cameraDiscovery = screen.getByTestId('camera-discovery');
    expect(cameraDiscovery).toBeTruthy();
  });

  it('hides camera discovery for simulated robots', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const simOption = await screen.findByRole('option', { name: /Robot Model B/i });
    fireEvent.click(simOption);

    expect(screen.queryByTestId('camera-discovery')).toBeNull();
  });

  it('shows Custom option in model dropdown', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);

    const customOption = await screen.findByRole('option', { name: /Custom/i });
    expect(customOption).toBeTruthy();
  });

  it('shows file upload when Custom is selected', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const customOption = await screen.findByRole('option', { name: /Custom/i });
    fireEvent.click(customOption);

    expect(screen.getByText(/Custom Model File/i)).toBeTruthy();
    expect(screen.getByText(/Upload Model File/i)).toBeTruthy();
    expect(screen.getByText(/Select Folder/i)).toBeTruthy();
  });

  it('saves custom simulated robot with robotModelId null', async () => {
    (global as unknown as Record<string, unknown>).window.electronAPI.selectModelFile =
      vi.fn().mockResolvedValue('/path/to/model.xml');
    (global as unknown as Record<string, unknown>).window.electronAPI.readModelFile =
      vi.fn().mockResolvedValue({
        content: '<mujoco><worldbody/></mujoco>',
        format: 'mjcf',
        baseName: 'custom_bot',
        metadata: { numJoints: 2, jointNames: ['j1', 'j2'], actuatorNames: ['a1'], siteNames: [], hasGripper: false },
      });

    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select Custom
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const customOption = await screen.findByRole('option', { name: /Custom/i });
    fireEvent.click(customOption);

    // Upload file
    const uploadBtn = screen.getByText(/Upload Model File/i);
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect((global as unknown as Record<string, unknown>).window.electronAPI.selectModelFile).toHaveBeenCalled();
    });

    const saveBtn = screen.getByText(/Save Robot/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        robotModelId: null,
        modality: 'simulated',
        simProperties: expect.objectContaining({
          xml_string: '<mujoco><worldbody/></mujoco>',
          modelFormat: 'mjcf',
          sourceDir: '/path/to/model.xml',
        }),
      }));
    });
  });

  it('sets robotModelId to null when editing and switching to Custom', async () => {
    const existingRobot = {
      id: 5,
      name: 'Existing Sim Bot',
      modality: 'simulated',
      robotModelId: 2,
      data: { type: 'simulation' },
      simProperties: { xml_string: '<mujoco/>' },
      realProperties: {},
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Switch to Custom
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const customOption = await screen.findByRole('option', { name: /Custom/i });
    fireEvent.click(customOption);

    const saveBtn = screen.getByText(/Save Robot/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        robotModelId: null,
        modality: 'simulated',
        simProperties: expect.objectContaining({
          xml_string: '<mujoco/>',
        }),
      }));
    });
  });

  it('shows customized badge when robot XML differs from model XML', async () => {
    const customizedXml = '<mujoco><worldbody><geom type="sphere" size="0.5"/></worldbody></mujoco>';

    const existingRobot = {
      id: 10,
      name: 'Customized Bot',
      modality: 'simulated',
      robotModelId: 2,
      data: { type: 'simulation' },
      simProperties: { xml_string: customizedXml },
      realProperties: {},
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // The robot's XML differs from the model's XML → customized badge
    await waitFor(() => {
      expect(screen.getByText('customized')).toBeTruthy();
    });
  });

  it('does not show customized badge when robot XML matches model XML', async () => {
    const sameXml = mockRobotModels[1].simProperties.xml_string;

    const existingRobot = {
      id: 10,
      name: 'Matching Bot',
      modality: 'simulated',
      robotModelId: 2,
      data: { type: 'simulation' },
      simProperties: { xml_string: sameXml },
      realProperties: {},
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Wait for model selection to resolve, then check no badge
    await waitFor(() => {
      expect(screen.queryByText('customized')).toBeNull();
    });
  });

  it('loads real robot config from realProperties', async () => {
    const realRobot = {
      id: 20,
      name: 'Real Bot',
      modality: 'real',
      robotModelId: 1,
      data: { type: 'real' },
      simProperties: {},
      realProperties: {
        config: {
          port: '/dev/ttyACM0',
          disable_torque_on_disconnect: false,
          use_degrees: true,
          max_relative_target: 10,
          calibration_dir: '/cal/dir',
        },
      },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={realRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Verify form fields are populated from realProperties
    const calDirInput = screen.getByLabelText(/Calibration Directory/i);
    expect(calDirInput).toHaveProperty('value', '/cal/dir');

    const maxInput = screen.getByLabelText(/Max Relative Target/i);
    expect(maxInput).toHaveProperty('value', '10');
  });

  it('shows device panel for new robots and auto-scans on mount', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    // The device panel should be visible
    const devicePanel = screen.getByTestId('device-panel');
    expect(devicePanel).toBeTruthy();

    // Auto-scan is triggered on mount via navigator.serial.getPorts
    await waitFor(() => {
      expect(mockGetPorts).toHaveBeenCalled();
    });

    // Devices appear in the left panel
    await waitFor(() => {
      expect(screen.getAllByText(/Device 1/).length).toBeGreaterThan(0);
    });
  });

  it('hides device panel when editing an existing robot', async () => {
    const existingRobot = {
      id: 5,
      name: 'Existing Bot',
      modality: 'real',
      robotModelId: 1,
      data: { type: 'real' },
      simProperties: {},
      realProperties: { config: { port: '/dev/ttyUSB0' } },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    expect(screen.queryByTestId('device-panel')).toBeNull();
  });

  it('collapses device panel and populates form when a device is clicked', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    // Wait for auto-scan
    await waitFor(() => {
      expect(screen.getAllByText(/Device 1/).length).toBeGreaterThan(0);
    });

    // Click a device
    const deviceCard = screen.getByRole('button', { name: /Select device 1/i });
    fireEvent.click(deviceCard);

    // Connection icon appears (indicates panel is collapsed)
    const connectionIcon = screen.getByLabelText(/Change connected device/i);
    expect(connectionIcon).toBeTruthy();
  });

  it('re-expands device panel and rescans when connection icon is clicked', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    // Wait for auto-scan
    await waitFor(() => {
      expect(screen.getAllByText(/Device 1/).length).toBeGreaterThan(0);
    });

    // Select a device to collapse the panel
    const deviceCard = screen.getByRole('button', { name: /Select device 1/i });
    fireEvent.click(deviceCard);

    // Verify connection icon is visible and click it
    const connectionIcon = screen.getByLabelText(/Change connected device/i);
    fireEvent.click(connectionIcon);

    // Connection icon disappears (panel expanded)
    expect(screen.queryByLabelText(/Change connected device/i)).toBeNull();

    // Second scan was triggered
    await waitFor(() => {
      expect(mockGetPorts).toHaveBeenCalledTimes(2);
    });
  });

  it('shows detected model name in parentheses on device card', async () => {
    mockDetect.mockResolvedValue('koch_follower');

    const mockModelsWithKoch = [
      ...mockRobotModels,
      {
        id: 65,
        name: 'Koch Follower',
        dirName: 'koch_follower',
        supportedModalities: ['real'],
        simProperties: {},
        realProperties: {},
      },
    ];
    (robotModelsResource.list as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockModelsWithKoch);

    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      // Both ports detected as koch_follower
      expect(screen.getAllByText('(koch_follower)').length).toBe(2);
    });
  });

  it('auto-populates robotModel when selecting a detected device', async () => {
    mockDetect.mockResolvedValue('koch_follower');

    const mockModelsWithKoch = [
      ...mockRobotModels,
      {
        id: 65,
        name: 'Koch Follower',
        dirName: 'koch_follower',
        supportedModalities: ['real'],
        simProperties: {},
        realProperties: {},
        teleoperator: false,
      },
    ];
    (robotModelsResource.list as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockModelsWithKoch);

    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(screen.getAllByText('(koch_follower)').length).toBeGreaterThan(0);
    });

    // Click the detected device
    const deviceCard = screen.getByRole('button', { name: /Select device 1/i });
    fireEvent.click(deviceCard);

    // Wait for async handleDeviceSelect to complete (auto-populates model after await)
    await waitFor(() => {
      expect(screen.getByLabelText(/Robot Name/i)).toBeTruthy();
    });

    // Fill name and save
    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'Koch Bot' } });

    const saveBtn = screen.getByText(/Save Robot/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Koch Bot',
        robotModelId: 65,
        modality: 'real',
        serialNumber: '0x1a86:0x7523',
      }));
    });
  });

  it('populates serial number field when device is selected', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Device 1/).length).toBeGreaterThan(0);
    });

    // Click the first device
    const deviceCard = screen.getByRole('button', { name: /Select device 1/i });
    fireEvent.click(deviceCard);

    // Serial number should be populated with vendorId:productId
    const serialInput = screen.getByLabelText(/Serial Number/i);
    expect(serialInput).toHaveProperty('value', '0x1a86:0x7523');
  });

  it('prompts user with requestPort when no previously-granted ports exist', async () => {
    mockGetPorts.mockResolvedValue([]);
    mockRequestPort.mockResolvedValue(mockWebSerialPort1);

    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(mockRequestPort).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Device 1/).length).toBeGreaterThan(0);
    });
  });

  it('scan guard prevents concurrent scans', async () => {
    // Make getPorts slow so two calls can overlap
    let resolvePorts: (ports: unknown[]) => void;
    mockGetPorts.mockImplementation(
      () => new Promise((r) => { resolvePorts = r; }),
    );

    render(<RobotForm onSaved={mockOnSaved} />);

    // Auto-scan fire on mount → first call is pending
    await waitFor(() => {
      expect(mockGetPorts).toHaveBeenCalledTimes(1);
    });

    // Click rescan while first scan hasn't completed
    const rescanBtn = screen.getByLabelText(/Rescan ports/i);
    fireEvent.click(rescanBtn);

    // getPorts should still be called only once (guard prevents second)
    expect(mockGetPorts).toHaveBeenCalledTimes(1);

    // Resolve the first scan
    resolvePorts!([mockWebSerialPort1]);

    await waitFor(() => {
      expect(screen.getAllByText(/Device 1/).length).toBeGreaterThan(0);
    });
  });

  it('displays scan error when getWebSerialPorts throws', async () => {
    mockGetPorts.mockRejectedValue(new Error('USB access denied'));
    mockRequestPort.mockRejectedValue(new Error('USB access denied'));

    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to scan USB ports: USB access denied/)).toBeTruthy();
    });
  });

  it('shows "No serial devices found" when scan returns empty', async () => {
    mockGetPorts.mockResolvedValue([]);
    mockRequestPort.mockRejectedValue(new Error('User cancelled'));

    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(screen.getByText(/No serial devices found/)).toBeTruthy();
    });
  });

  it('renders editing mode with real robot fields populated', async () => {
    const existingRobot = {
      id: 30,
      name: 'Edit Bot',
      modality: 'real',
      robotModelId: 1,
      data: { type: 'real' },
      simProperties: {},
      realProperties: {
        config: {
          port: '/dev/ttyUSB0',
          disable_torque_on_disconnect: true,
          use_degrees: false,
          max_relative_target: 5,
          calibration_dir: '/home/cal',
        },
      },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Editing mode should populate name
    const nameInput = screen.getByLabelText(/Robot Name/i);
    expect(nameInput).toHaveProperty('value', 'Edit Bot');

    // Calibration directory should be populated
    const calDirInput = screen.getByLabelText(/Calibration Directory/i);
    expect(calDirInput).toHaveProperty('value', '/home/cal');

    // Device panel should NOT be shown in editing mode
    expect(screen.queryByTestId('device-panel')).toBeNull();
  });

  it('edits serial number directly in editing mode', async () => {
    const existingRobot = {
      id: 30,
      name: 'Edit Bot',
      modality: 'real',
      robotModelId: 1,
      data: { type: 'real' },
      simProperties: {},
      realProperties: { config: { port: '' } },
      serialNumber: 'old-serial',
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Device panel should NOT exist in editing mode
    expect(screen.queryByTestId('device-panel')).toBeNull();

    // Serial number should be editable
    const serialInputs = screen.getAllByLabelText(/Serial Number/i);
    expect(serialInputs.length).toBeGreaterThanOrEqual(1);
    fireEvent.change(serialInputs[serialInputs.length - 1], { target: { value: 'new-serial' } });

    fireEvent.click(screen.getByText(/Save Robot/i));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        serialNumber: 'new-serial',
      }));
    });
  });

  it('renders multi-modality model with explicit modality selector', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select Robot Model C (both real and simulated modalities)
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const modelOption = await screen.findByRole('option', { name: /Robot Model C/i });
    fireEvent.click(modelOption);

    // Modality selector should appear since model supports both
    const modalitySelect = screen.getByLabelText(/Modality/i);
    expect(modalitySelect).toBeTruthy();

    // Switch to simulated
    fireEvent.mouseDown(modalitySelect);
    const simOption = await screen.findByRole('option', { name: /Simulated/i });
    fireEvent.click(simOption);

    // Camera discovery should disappear for simulated
    expect(screen.queryByTestId('camera-discovery')).toBeNull();
  });

  it('shows Cancel button when onCancel is provided', async () => {
    render(<RobotForm onSaved={mockOnSaved} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    const cancelBtn = screen.getByText(/Cancel/);
    expect(cancelBtn).toBeTruthy();
    fireEvent.click(cancelBtn);
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('does not show Cancel button when onCancel is not provided', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    expect(screen.queryByText(/Cancel/)).toBeNull();
  });

  it('saves real robot with cameras when cameras are discovered', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select real model
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const modelOption = await screen.findByRole('option', { name: /Robot Model A/i });
    fireEvent.click(modelOption);

    // Wait for auto-scan to finish (model A is real-only so device panel is relevant)
    await waitFor(() => {
      expect(mockGetPorts).toHaveBeenCalled();
    });

    // Select a device (this auto-populates the name)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Select device/ }).length).toBeGreaterThan(0);
    });
    const deviceCard = screen.getByRole('button', { name: /Select device 1/i });
    fireEvent.click(deviceCard);

    // Set name after device selection (device click auto-populates name)
    await waitFor(() => {
      expect(screen.getByLabelText(/Robot Name/i)).toBeTruthy();
    });
    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'Camera Bot' } });

    const saveBtn = screen.getByText(/Save Robot/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Camera Bot',
        modality: 'real',
      }));
    });
  });

  it('returns early from handleSave when onSaved is not provided', async () => {
    render(<RobotForm />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    const saveBtn = screen.getByText(/Save Robot/i);
    fireEvent.click(saveBtn);

    // Should not throw, just no-op
    expect(mockOnSaved).not.toHaveBeenCalled();
  });

  it('saves simulated robot with customized XML', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'Customized Bot' } });

    // Select model B (simulated)
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const modelOption = await screen.findByRole('option', { name: /Robot Model B/i });
    fireEvent.click(modelOption);

    // Modify the XML in the editor
    const editor = await screen.findByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: '<mujoco><worldbody><geom type="capsule" size="0.3"/></worldbody></mujoco>' } });

    const saveBtn = screen.getByText(/Save Robot/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        modality: 'simulated',
        simProperties: expect.objectContaining({
          xml_string: '<mujoco><worldbody><geom type="capsule" size="0.3"/></worldbody></mujoco>',
        }),
      }));
    });
  });

  it('handles model load failure gracefully', async () => {
    (robotModelsResource.list as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));

    render(<RobotForm onSaved={mockOnSaved} />);

    // Should still render without crashing
    await waitFor(() => {
      expect(screen.getByText(/Save Robot/)).toBeTruthy();
    });
  });

  it('shows detected model display name from modelOptions', async () => {
    mockDetect.mockResolvedValue('detected_bot_x');

    const extendedModels = [
      ...mockRobotModels,
      {
        id: 200,
        name: 'Detected Bot X',
        dirName: 'detected_bot_x',
        supportedModalities: ['real'],
        simProperties: {},
        realProperties: {},
        teleoperator: false,
      },
    ];
    (robotModelsResource.list as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(extendedModels);

    render(<RobotForm onSaved={mockOnSaved} />);

    // Wait for scan to find detected model name
    await waitFor(() => {
      expect(mockGetPorts).toHaveBeenCalled();
    });

    // The model display name should appear instead of raw dirName
    await waitFor(() => {
      expect(screen.getAllByText('Detected Bot X').length).toBeGreaterThan(0);
    });
  });

  it('shows vendor label from USB vendor lookup', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    // Wait for auto-scan to complete
    await waitFor(() => {
      expect(mockGetPorts).toHaveBeenCalled();
    });

    // Wait for devices to appear
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Select device/ }).length).toBeGreaterThan(0);
    });

    // Vendor ID should be displayed as hex (db mock returns [] so it falls back to vendorId)
    expect(screen.getByText(/0x1a86/)).toBeTruthy();
  });

  it('existing simulated robot with no model shows custom', async () => {
    const simRobotNoModel = {
      id: 40,
      name: 'No Model Sim Bot',
      modality: 'simulated',
      robotModelId: null,
      data: { type: 'simulation' },
      simProperties: { xml_string: '<mujoco/>' },
      realProperties: {},
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={simRobotNoModel} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Custom model file upload should be available
    expect(screen.getByText(/Custom Model File/)).toBeTruthy();
  });

  it('shows scanning spinner while scan is in progress', async () => {
    let resolvePorts: (ports: unknown[]) => void;
    mockGetPorts.mockImplementation(
      () => new Promise((r) => { resolvePorts = r; }),
    );

    render(<RobotForm onSaved={mockOnSaved} />);

    // Spinner should be visible during scan
    await waitFor(() => {
      expect(screen.getByText(/Scanning for devices/)).toBeTruthy();
    });

    // Complete the scan
    resolvePorts!([mockWebSerialPort1]);

    await waitFor(() => {
      expect(screen.queryByText(/Scanning for devices/)).toBeNull();
    });
  });

  it('handles folder selection for custom model', async () => {
    (global as unknown as Record<string, unknown>).window.electronAPI.selectModelFolder =
      vi.fn().mockResolvedValue('/path/to/model_folder');
    (global as unknown as Record<string, unknown>).window.electronAPI.readModelFile =
      vi.fn().mockResolvedValue({
        content: '<mujoco><worldbody><body/></worldbody></mujoco>',
        format: 'mjcf',
        baseName: 'folder_model',
        metadata: { numJoints: 3, jointNames: ['j1', 'j2', 'j3'], actuatorNames: ['a1', 'a2'], siteNames: [], hasGripper: true },
      });

    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select Custom
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const customOption = await screen.findByRole('option', { name: /Custom/i });
    fireEvent.click(customOption);

    // Click Select Folder button
    const folderBtn = screen.getByText(/Select Folder/i);
    fireEvent.click(folderBtn);

    await waitFor(() => {
      expect((global as unknown as Record<string, unknown>).window.electronAPI.selectModelFolder).toHaveBeenCalled();
    });

    // Model metadata should be visible
    await waitFor(() => {
      expect(screen.getByText(/folder_model/)).toBeTruthy();
    });
  });

  it('handles file selection error for custom model', async () => {
    (global as unknown as Record<string, unknown>).window.electronAPI.selectModelFile =
      vi.fn().mockRejectedValue(new Error('File read failed'));

    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select Custom
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const customOption = await screen.findByRole('option', { name: /Custom/i });
    fireEvent.click(customOption);

    // Click Upload button
    const uploadBtn = screen.getByText(/Upload Model File/i);
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(screen.getByText(/File read failed/)).toBeTruthy();
    });
  });

  it('handles folder selection error for custom model', async () => {
    (global as unknown as Record<string, unknown>).window.electronAPI.selectModelFolder =
      vi.fn().mockRejectedValue(new Error('Folder read failed'));

    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select Custom
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const customOption = await screen.findByRole('option', { name: /Custom/i });
    fireEvent.click(customOption);

    // Click Select Folder button
    const folderBtn = screen.getByText(/Select Folder/i);
    fireEvent.click(folderBtn);

    await waitFor(() => {
      expect(screen.getByText(/Folder read failed/)).toBeTruthy();
    });
  });

  it('handles cancelled file selection for custom model', async () => {
    (global as unknown as Record<string, unknown>).window.electronAPI.selectModelFile =
      vi.fn().mockResolvedValue(null);

    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select Custom
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const customOption = await screen.findByRole('option', { name: /Custom/i });
    fireEvent.click(customOption);

    // Click Upload button then cancel
    const uploadBtn = screen.getByText(/Upload Model File/i);
    fireEvent.click(uploadBtn);

    // No error and no file data should appear
    await waitFor(() => {
      expect(screen.queryByText(/File read failed/)).toBeNull();
    });
  });

  it('handles cancelled folder selection for custom model', async () => {
    (global as unknown as Record<string, unknown>).window.electronAPI.selectModelFolder =
      vi.fn().mockResolvedValue(null);

    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select Custom
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const customOption = await screen.findByRole('option', { name: /Custom/i });
    fireEvent.click(customOption);

    // Click Select Folder and cancel
    const folderBtn = screen.getByText(/Select Folder/i);
    fireEvent.click(folderBtn);

    // Should not show errors
    await waitFor(() => {
      expect(screen.queryByText(/Folder read failed/)).toBeNull();
    });
  });

  it('form interaction: changing real robot config fields', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Wait for auto-scan to complete
    await waitFor(() => {
      expect(mockGetPorts).toHaveBeenCalled();
    });

    // Wait for devices to appear, then select one
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Select device/ }).length).toBeGreaterThan(0);
    });
    const deviceCard = screen.getByRole('button', { name: /Select device 1/i });
    fireEvent.click(deviceCard);

    // Select real model
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const modelOption = await screen.findByRole('option', { name: /Robot Model A/i });
    fireEvent.click(modelOption);

    // Modify real config fields (LeRobot Port and LeRobot Robot ID fields were removed)
    const maxInput = screen.getByLabelText(/Max Relative Target/i);
    fireEvent.change(maxInput, { target: { value: '10' } });

    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'Configured Bot' } });

    // Save
    const saveBtn = screen.getByText(/Save Robot/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Configured Bot',
        realProperties: expect.objectContaining({
          config: expect.objectContaining({
            max_relative_target: 10,
          }),
        }),
      }));
    });
  });

  it('adds and removes cameras via CameraDiscovery callbacks', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select a real model to show camera discovery
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const modelOption = await screen.findByRole('option', { name: /Robot Model A/i });
    fireEvent.click(modelOption);

    // Add camera via mock callback
    const addCameraBtn = screen.getByTestId('camera-add');
    fireEvent.click(addCameraBtn);

    // Camera should appear in discovery list
    await waitFor(() => {
      expect(screen.getByTestId('camera-Test Camera')).toBeTruthy();
    });

    // Remove camera
    const removeCameraBtn = screen.getByTestId('camera-remove');
    fireEvent.click(removeCameraBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('camera-Test Camera')).toBeNull();
    });
  });

  it('saves real robot with cameras including serial and resolution extraction', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Wait for auto-scan and select a device
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Select device/ }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole('button', { name: /Select device 1/i }));

    // Select real model
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const modelOption = await screen.findByRole('option', { name: /Robot Model A/i });
    fireEvent.click(modelOption);

    // Add camera (via mock)
    const addCameraBtn = screen.getByTestId('camera-add');
    fireEvent.click(addCameraBtn);

    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'Cam Bot' } });

    // Save
    fireEvent.click(screen.getByText(/Save Robot/i));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Cam Bot',
        modality: 'real',
        realProperties: expect.objectContaining({
          cameras: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Camera',
              serialNumber: 'ABC123',
            }),
          ]),
        }),
      }));
    });
  });

  it('opens and closes calibration dialog', async () => {
    const existingRobot = {
      id: 50,
      name: 'Cal Bot',
      modality: 'real',
      robotModelId: 1,
      data: { type: 'real' },
      simProperties: {},
      realProperties: {
        config: { port: '/dev/ttyUSB0' },
      },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Click Calibrate Robot button
    const calibrateBtn = screen.getByText(/Calibrate Robot/i);
    fireEvent.click(calibrateBtn);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByTestId('calibration-dialog')).toBeTruthy();
    });

    // Close dialog
    fireEvent.click(screen.getByTestId('calibration-close'));

    await waitFor(() => {
      expect(screen.queryByTestId('calibration-dialog')).toBeNull();
    });
  });

  it('saves calibration data via calibration dialog', async () => {
    (window as unknown as Record<string, Record<string, unknown>>).electronAPI.writeJsonFile = vi.fn().mockResolvedValue(undefined);

    const existingRobot = {
      id: 50,
      name: 'Cal Bot',
      modality: 'real',
      robotModelId: 1,
      data: { type: 'real' },
      simProperties: {},
      realProperties: {
        config: { port: '/dev/ttyUSB0', calibration_dir: '/cal/output' },
      },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Open calibration dialog
    fireEvent.click(screen.getByText(/Calibrate Robot/i));

    await waitFor(() => {
      expect(screen.getByTestId('calibration-dialog')).toBeTruthy();
    });

    // Save calibration
    fireEvent.click(screen.getByTestId('calibration-save'));

    // Dialog should close and calibration data saved
    await waitFor(() => {
      expect(screen.queryByTestId('calibration-dialog')).toBeNull();
    });

    expect((window as unknown as Record<string, Record<string, unknown>>).electronAPI.writeJsonFile).toHaveBeenCalledWith(
      '/cal/output/calibration.json',
      { motor1: 0, motor2: 1 },
    );
  });

  it('handles MujocoPreview error and success callbacks', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select simulated model to show preview
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const modelOption = await screen.findByRole('option', { name: /Robot Model B/i });
    fireEvent.click(modelOption);

    await waitFor(() => {
      expect(screen.getByTestId('mujoco-preview')).toBeTruthy();
    });

    // Trigger error
    fireEvent.click(screen.getByTestId('mujoco-trigger-error'));

    await waitFor(() => {
      expect(screen.getByText(/XML Error/)).toBeTruthy();
      expect(screen.getByText(/test error/)).toBeTruthy();
    });

    // Trigger success — error should clear
    fireEvent.click(screen.getByTestId('mujoco-trigger-success'));

    await waitFor(() => {
      expect(screen.queryByText(/XML Error/)).toBeNull();
    });
  });

  it('debounces editor changes and updates preview XML', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select sim model to show editor
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const modelOption = await screen.findByRole('option', { name: /Robot Model B/i });
    fireEvent.click(modelOption);

    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeTruthy();
    });

    // Type in editor
    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: '<mujoco><worldbody><geom type="capsule"/></worldbody></mujoco>' } });

    // After debounce (~800ms), preview should update
    await waitFor(() => {
      const preview = screen.getByTestId('mujoco-preview');
      expect(preview.getAttribute('data-xml')).toContain('capsule');
    }, { timeout: 2000 });
  });

  it('handles selectCalibrationDir via electronAPI', async () => {
    (window as unknown as Record<string, Record<string, unknown>>).electronAPI.selectDirectory = vi.fn().mockResolvedValue('/new/cal/path');

    const existingRobot = {
      id: 55,
      name: 'Dir Bot',
      modality: 'real',
      robotModelId: 1,
      data: { type: 'real' },
      simProperties: {},
      realProperties: { config: { port: '/dev/ttyUSB0' } },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Click folder icon to select calibration dir
    const folderButtons = screen.getAllByRole('button').filter(
      btn => btn.querySelector('[data-testid="FolderOpenIcon"]')
    );
    expect(folderButtons.length).toBeGreaterThan(0);
    fireEvent.click(folderButtons[0]);

    await waitFor(() => {
      const calDirInput = screen.getByLabelText(/Calibration Directory/i);
      expect((calDirInput as HTMLInputElement).value).toBe('/new/cal/path');
    });
  });

  it('editing mode: changes disableTorque, useDegrees, and serial number fields', async () => {
    const existingRobot = {
      id: 60,
      name: 'Config Bot',
      modality: 'real',
      robotModelId: 1,
      data: { type: 'real' },
      simProperties: {},
      realProperties: {
        config: {
          port: '/dev/ttyUSB0',
          disable_torque_on_disconnect: true,
          use_degrees: false,
        },
      },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Change Disable Torque on Disconnect
    const torqueSelect = screen.getByLabelText(/Disable Torque on Disconnect/i);
    fireEvent.mouseDown(torqueSelect);
    const falseOption = await screen.findByRole('option', { name: 'False' });
    fireEvent.click(falseOption);

    // Change Use Degrees
    const degreesSelect = screen.getByLabelText(/Use Degrees/i);
    fireEvent.mouseDown(degreesSelect);
    const trueOption = await screen.findByRole('option', { name: 'True' });
    fireEvent.click(trueOption);

    // Change Serial Number in editing mode (multiple inputs share this label)
    const serialInputs = screen.getAllByLabelText(/Serial Number/i);
    fireEvent.change(serialInputs[0], { target: { value: '0x1234:0x5678' } });

    // Save
    fireEvent.click(screen.getByText(/Save Robot/i));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        serialNumber: '0x1234:0x5678',
        realProperties: expect.objectContaining({
          config: expect.objectContaining({
            disable_torque_on_disconnect: false,
            use_degrees: true,
          }),
        }),
      }));
    });
  });

  it('saves custom simulated robot with model file data', async () => {
    (window as unknown as Record<string, Record<string, unknown>>).electronAPI.selectModelFile =
      vi.fn().mockResolvedValue('/path/to/model.xml');
    (window as unknown as Record<string, Record<string, unknown>>).electronAPI.readModelFile =
      vi.fn().mockResolvedValue({
        content: '<mujoco><worldbody><geom type="cylinder"/></worldbody></mujoco>',
        format: 'mjcf',
        baseName: 'Custom Cylinder',
        metadata: { numJoints: 3, numBodies: 2, jointNames: ['j1', 'j2', 'j3'], actuatorNames: ['a1', 'a2'], siteNames: [], hasGripper: false },
      });

    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select Custom model
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const customOption = await screen.findByRole('option', { name: /Custom/i });
    fireEvent.click(customOption);

    // Upload file
    const uploadBtn = screen.getByText(/Upload Model File/i);
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect((window as unknown as Record<string, Record<string, unknown>>).electronAPI.selectModelFile).toHaveBeenCalled();
    });

    // Name should auto-populate from file baseName
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Robot Name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Custom Cylinder');
    });

    // Save
    fireEvent.click(screen.getByText(/Save Robot/i));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Custom Cylinder',
        modality: 'simulated',
        robotModelId: null,
        simProperties: expect.objectContaining({
          xml_string: expect.stringContaining('cylinder'),
          modelFormat: 'mjcf',
          sourceDir: '/path/to/model.xml',
        }),
      }));
    });
  });

  it('editing mode: updates serial number via input', async () => {
    const existingRobot = {
      id: 65,
      name: 'Edit Sel Bot',
      modality: 'real',
      robotModelId: 1,
      data: { type: 'real' },
      simProperties: {},
      realProperties: {
        config: { port: '/dev/ttyUSB0' },
      },
      serialNumber: '0x0403:0x6001',
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // No device panel in editing mode
    expect(screen.queryByTestId('device-panel')).toBeNull();

    // Update serial number via the editing-mode input
    const serialInputs = screen.getAllByLabelText(/Serial Number/i);
    fireEvent.change(serialInputs[serialInputs.length - 1], { target: { value: 'updated-serial' } });

    fireEvent.click(screen.getByText(/Save Robot/i));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        serialNumber: 'updated-serial',
      }));
    });
  });

  it('handles max_relative_target empty string as null', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Wait for auto-scan
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Select device/ }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole('button', { name: /Select device 1/i }));

    // Select model
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    fireEvent.click(await screen.findByRole('option', { name: /Robot Model A/i }));

    // Clear max relative target
    const maxInput = screen.getByLabelText(/Max Relative Target/i);
    fireEvent.change(maxInput, { target: { value: '' } });

    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'Empty Max Bot' } });

    fireEvent.click(screen.getByText(/Save Robot/i));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        realProperties: expect.objectContaining({
          config: expect.objectContaining({
            max_relative_target: null,
          }),
        }),
      }));
    });
  });

  it('editing mode: can change robot model selection', async () => {
    const existingRobot = {
      id: 70,
      name: 'Detect Bot',
      modality: 'real',
      robotModelId: null,
      data: { type: 'real' },
      simProperties: {},
      realProperties: {
        config: { port: '/dev/ttyUSB0' },
      },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // No device panel in editing mode
    expect(screen.queryByTestId('device-panel')).toBeNull();

    // Select Robot Model A
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const modelOption = await screen.findByRole('option', { name: /Robot Model A/i });
    fireEvent.click(modelOption);

    fireEvent.click(screen.getByText(/Save Robot/i));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        robotModelId: 1,
      }));
    });
  });

  it('editing mode: changes serial number via the edit-mode input', async () => {
    const existingRobot = {
      id: 71,
      name: 'Serial Bot',
      modality: 'real',
      robotModelId: 1,
      data: { type: 'real' },
      simProperties: {},
      realProperties: {
        config: { port: '/dev/ttyUSB0' },
      },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // In editing mode, there are two Serial Number inputs — use the editing-mode one (second in DOM)
    const serialInputs = screen.getAllByLabelText(/Serial Number/i);
    expect(serialInputs.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(serialInputs[1], { target: { value: 'manual-serial' } });

    fireEvent.click(screen.getByText(/Save Robot/i));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        serialNumber: 'manual-serial',
      }));
    });
  });

  it('editing mode: changes calibration directory via input', async () => {
    const existingRobot = {
      id: 72,
      name: 'Cal Dir Bot',
      modality: 'real',
      robotModelId: 1,
      data: { type: 'real' },
      simProperties: {},
      realProperties: {
        config: { port: '/dev/ttyUSB0', calibration_dir: '/old/path' },
      },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={existingRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Change calibration directory via the input (not the folder button)
    const calDirInput = screen.getByLabelText(/Calibration Directory/i);
    fireEvent.change(calDirInput, { target: { value: '/new/cal/dir' } });

    fireEvent.click(screen.getByText(/Save Robot/i));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        realProperties: expect.objectContaining({
          config: expect.objectContaining({
            calibration_dir: '/new/cal/dir',
          }),
        }),
      }));
    });
  });

  it('camera serial extraction uses deviceLabel pattern when no explicit serial', async () => {
    // This tests the extractCameraSerialNumber helper through save flow
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select device and model
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Select device/ }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole('button', { name: /Select device 1/i }));

    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    fireEvent.click(await screen.findByRole('option', { name: /Robot Model A/i }));

    // Add camera — the mock CameraDiscovery onAdd provides a camera with serial in deviceLabel
    fireEvent.click(screen.getByTestId('camera-add'));

    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'Serial Extract Bot' } });

    fireEvent.click(screen.getByText(/Save Robot/i));

    // Camera serial should be extracted from "USB Camera serial:ABC123"
    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        realProperties: expect.objectContaining({
          cameras: expect.arrayContaining([
            expect.objectContaining({
              serialNumber: 'ABC123',
            }),
          ]),
        }),
      }));
    });
  });

  it('shows teleoperator checkbox and filters models when checked', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // The teleoperator checkbox should be present
    const teleopCheckbox = screen.getByLabelText(/Teleoperator/i);
    expect(teleopCheckbox).toBeTruthy();

    // Without teleoperator checked, robot models should be visible
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    expect(await screen.findByRole('option', { name: /Robot Model A/i })).toBeTruthy();
    // Teleoperator models should NOT be listed
    expect(screen.queryByRole('option', { name: /Phone/i })).toBeNull();
    // Close dropdown
    fireEvent.keyDown(modelSelect, { key: 'Escape' });

    // Check the teleoperator checkbox
    fireEvent.click(teleopCheckbox);

    // Now only teleoperator models should appear in dropdown
    fireEvent.mouseDown(modelSelect);
    expect(await screen.findByRole('option', { name: /Phone/i })).toBeTruthy();
    expect(await screen.findByRole('option', { name: /Keyboard/i })).toBeTruthy();
    // Robot models should NOT be listed
    expect(screen.queryByRole('option', { name: /Robot Model A/i })).toBeNull();
  });

  it('includes teleoperator=true in save payload when checkbox is checked', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Check teleoperator
    const teleopCheckbox = screen.getByLabelText(/Teleoperator/i);
    fireEvent.click(teleopCheckbox);

    // Fill name
    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'My Teleoperator' } });

    // Save
    fireEvent.click(screen.getByText(/Save Robot/i));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: 'My Teleoperator',
        teleoperator: true,
      }));
    });
  });

  it('includes teleoperator=false in save payload when checkbox is unchecked', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Wait for auto scan and select device
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Select device/ }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole('button', { name: /Select device 1/i }));

    // Select real model
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    fireEvent.click(await screen.findByRole('option', { name: /Robot Model A/i }));

    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'Regular Robot' } });

    fireEvent.click(screen.getByText(/Save Robot/i));

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Regular Robot',
        teleoperator: false,
      }));
    });
  });

  it('pre-selects teleoperator checkbox when editing a teleoperator robot', async () => {
    const teleoperatorRobot = {
      id: 100,
      name: 'My Teleop',
      modality: 'real',
      robotModelId: 69,
      teleoperator: true,
      data: {},
      simProperties: {},
      realProperties: { config: { port: '' } },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={teleoperatorRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Teleoperator checkbox should be checked
    const teleopCheckbox = screen.getByLabelText(/Teleoperator/i);
    expect(teleopCheckbox.querySelector('input[type="checkbox"]')?.checked ?? (teleopCheckbox as HTMLInputElement).checked).toBe(true);
  });

  it('resets robot model selection when toggling teleoperator checkbox', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select a robot model
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    fireEvent.click(await screen.findByRole('option', { name: /Robot Model A/i }));

    // Toggle teleoperator on — should reset model selection
    const teleopCheckbox = screen.getByLabelText(/Teleoperator/i);
    fireEvent.click(teleopCheckbox);

    // Model select should be reset (show default placeholder)
    // After toggling teleoperator, robotModelId state resets to ""
    // Verify the previous selection is no longer displayed
    expect(modelSelect.textContent).not.toContain('Robot Model A');
  });
});
