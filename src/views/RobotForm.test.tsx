import React from 'react';
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RobotForm from './RobotForm';
import { robotModelsResource } from '../db/resources';

vi.mock('../db/db', () => ({
  db: {},
}));

// Mock the resources
vi.mock('../db/resources', () => ({
  robotModelsResource: {
    list: vi.fn(),
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
  default: ({ xml, _onError, _onSuccess }: Record<string, unknown>) => (
    <div data-testid="mujoco-preview" data-xml={xml || ''} />
  ),
  MujocoPreview: ({ xml, _onError, _onSuccess }: Record<string, unknown>) => (
    <div data-testid="mujoco-preview" data-xml={xml || ''} />
  ),
}));

// Mock CameraDiscovery (navigator.mediaDevices not available in jsdom)
vi.mock('../ui/CameraDiscovery', () => ({
  default: ({ cameras, _onAdd, _onRemove }: Record<string, unknown>) => (
    <div data-testid="camera-discovery">
      {cameras?.map((c: Record<string, unknown>) => (
        <div key={c.name} data-testid={`camera-${c.name}`}>{c.name}</div>
      ))}
    </div>
  ),
  CameraDiscovery: ({ cameras, _onAdd, _onRemove }: Record<string, unknown>) => (
    <div data-testid="camera-discovery">
      {cameras?.map((c: Record<string, unknown>) => (
        <div key={c.name} data-testid={`camera-${c.name}`}>{c.name}</div>
      ))}
    </div>
  ),
}));

describe('RobotForm', () => {
  const mockOnSaved = vi.fn();
  const mockOnCancel = vi.fn();

  const mockRobotModels = [
    {
      id: 1,
      name: 'Robot Model A',
      supportedModalities: ['real'],
      simProperties: {},
      realProperties: {},
    },
    {
      id: 2,
      name: 'Robot Model B',
      supportedModalities: ['simulated'],
      simProperties: {
        xml_string: '<mujoco><worldbody><geom type="box" size="0.1"/></worldbody></mujoco>',
      },
      realProperties: {},
    },
    {
      id: 3,
      name: 'Robot Model C',
      supportedModalities: ['real', 'simulated'],
      simProperties: {
        xml_string: '<mujoco><worldbody><geom type="sphere" size="0.2"/></worldbody></mujoco>',
      },
      realProperties: {},
    },
  ];

  const mockSerialPorts = [
    { path: '/dev/ttyUSB0', manufacturer: 'Acme', serialNumber: 'SerialNumber1' },
    { path: '/dev/ttyUSB1', manufacturer: 'RobCo', serialNumber: 'B2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (robotModelsResource.list as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockRobotModels);

    // Mock electronAPI
    (global as unknown as Record<string, unknown>).window.electronAPI = {
      scanSerialPorts: vi.fn().mockResolvedValue(mockSerialPorts),
      selectModelFile: vi.fn().mockResolvedValue(null),
      selectModelFolder: vi.fn().mockResolvedValue(null),
      readModelFile: vi.fn().mockResolvedValue({
        content: '<mujoco/>',
        format: 'mjcf',
        baseName: 'custom_model',
        metadata: { numJoints: 0, jointNames: [], actuatorNames: [], siteNames: [], hasGripper: false },
      }),
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

    // Scan Serial Ports
    const scanBtns = screen.getAllByText(/Scan ports/i);
    fireEvent.click(scanBtns[0]);

    await waitFor(() => {
      expect((global as unknown as Record<string, unknown>).window.electronAPI.scanSerialPorts).toHaveBeenCalled();
      const acmeElements = screen.getAllByText(/Acme/);
      expect(acmeElements.length).toBeGreaterThan(0);
    });

    // Fill out form
    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'My Test Robot' } });

    // Select Robot Model A (real)
    const modelSelectTrigger = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelectTrigger);
    const modelOption = await screen.findByRole('option', { name: /Robot Model A/i });
    fireEvent.click(modelOption);

    // Connect Device
    const deviceCard = await screen.findByRole('button', { name: /Select device SerialNumber1/i });
    fireEvent.click(deviceCard);

    // Save
    const saveBtn = screen.getByText(/Save Robot/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: 'My Test Robot',
        robotModelId: 1,
        modality: 'real',
        serialNumber: 'SerialNumber1',
        realProperties: expect.objectContaining({
          config: expect.objectContaining({
            port: '/dev/ttyUSB0',
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
          id: 'robot-1',
          calibration_dir: '/cal/dir',
        },
      },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={realRobot} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Verify form fields are populated from realProperties
    const portInput = screen.getByLabelText(/LeRobot Port/i);
    expect(portInput).toHaveProperty('value', '/dev/ttyACM0');

    const configIdInput = screen.getByLabelText(/LeRobot Robot ID/i);
    expect(configIdInput).toHaveProperty('value', 'robot-1');

    const calDirInput = screen.getByLabelText(/Calibration Directory/i);
    expect(calDirInput).toHaveProperty('value', '/cal/dir');
  });
});
