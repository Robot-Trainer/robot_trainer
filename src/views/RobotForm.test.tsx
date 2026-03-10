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
  default: ({ value, onChange }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

// Mock MujocoPreview (Three.js/WebGL not available in jsdom)
vi.mock('../ui/MujocoPreview', () => ({
  default: ({ xml, onError, onSuccess }: any) => (
    <div data-testid="mujoco-preview" data-xml={xml || ''} />
  ),
  MujocoPreview: ({ xml, onError, onSuccess }: any) => (
    <div data-testid="mujoco-preview" data-xml={xml || ''} />
  ),
}));

// Mock CameraDiscovery (navigator.mediaDevices not available in jsdom)
vi.mock('../ui/CameraDiscovery', () => ({
  default: ({ cameras, onAdd, onRemove }: any) => (
    <div data-testid="camera-discovery">
      {cameras?.map((c: any) => (
        <div key={c.name} data-testid={`camera-${c.name}`}>{c.name}</div>
      ))}
    </div>
  ),
  CameraDiscovery: ({ cameras, onAdd, onRemove }: any) => (
    <div data-testid="camera-discovery">
      {cameras?.map((c: any) => (
        <div key={c.name} data-testid={`camera-${c.name}`}>{c.name}</div>
      ))}
    </div>
  ),
}));

describe('RobotForm', () => {
  const mockOnSaved = vi.fn();
  const mockOnCancel = vi.fn();

  const mockRobotModels = [
    { id: 1, name: 'Robot Model A', modality: 'real', className: 'SO100Follower' },
    { id: 2, name: 'Robot Model B', modality: 'simulated', className: 'GenericMujocoEnv' },
    {
      id: 3,
      name: 'Robot Model C',
      supportedModalities: ['real', 'simulated'],
      className: 'HybridRobotModel'
    },
  ];

  const mockSerialPorts = [
    { path: '/dev/ttyUSB0', manufacturer: 'Acme', serialNumber: 'SerialNumber1' },
    { path: '/dev/ttyUSB1', manufacturer: 'RobCo', serialNumber: 'B2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (robotModelsResource.list as any).mockResolvedValue(mockRobotModels);

    // Mock electronAPI
    (global as any).window.electronAPI = {
      scanSerialPorts: vi.fn().mockResolvedValue(mockSerialPorts),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('loads robot models and handles form interactions', async () => {
    render(<RobotForm onSaved={mockOnSaved} onCancel={mockOnCancel} />);

    // Wait for models to load
    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Interaction 1: Scan Serial Ports
    // Use getAllByText in case there are multiple buttons (e.g. desktop/mobile or empty state)
    const scanBtns = screen.getAllByText(/Scan ports/i);
    fireEvent.click(scanBtns[0]);

    await waitFor(() => {
      expect((global as any).window.electronAPI.scanSerialPorts).toHaveBeenCalled();
      // Check if serial ports are displayed in the list
      // "Acme" might appear in the card list and potentially in the connected device dropdown
      const acmeElements = screen.getAllByText(/Acme/);
      expect(acmeElements.length).toBeGreaterThan(0);
    });

    // Interaction 2: Fill out form
    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'My Test Robot' } });

    // Select Robot Model using the combobox/select
    // 1. Open the dropdown
    const modelSelectTrigger = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelectTrigger);

    // 2. Wait for options to populate and select one (name now includes badge text)
    const modelOption = await screen.findByRole('option', { name: /Robot Model A/i });
    fireEvent.click(modelOption);

    // Connect Device
    // We can select from the scanned list (which we triggered scan for)
    // or type manually. The scanned list items are clickable.
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
        data: expect.objectContaining({
          type: 'real',
          config: expect.objectContaining({
            port: '/dev/ttyUSB0',
            disable_torque_on_disconnect: true,
            use_degrees: false,
          })
        })
      }));
    });
  });

  it('shows modality badges in robot model dropdown', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Open the model dropdown
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);

    // Verify badges appear for model modalities
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

  it('handles simulated robot setup', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'Sim Robot' } });

    // Select Robot Model
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const modelOption = await screen.findByRole('option', { name: /Robot Model B/i });
    fireEvent.click(modelOption);

    // Real-device section should disappear for simulated model
    expect(screen.queryByText(/Real Robot Configuration/i)).toBeNull();

    const saveBtn = screen.getByText(/Save Robot/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Sim Robot',
        modality: 'simulated',
        serialNumber: '', // Should be cleared/empty for sim
        robotModelId: 2,
        data: { type: 'simulation' }
      }));
    });
  });

  it('shows monaco editor and 3D preview when editing a simulated robot', async () => {
    const simRobotData = {
      id: 10,
      name: 'My Sim Bot',
      modality: 'simulated',
      robotModelId: 2,
      data: {
        type: 'simulation',
        modelXml: '<mujoco><worldbody><geom type="sphere" size="0.1"/></worldbody></mujoco>',
      },
    };

    render(<RobotForm onSaved={mockOnSaved} initialData={simRobotData} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Monaco editor should be rendered (mocked as textarea)
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeTruthy();

    // 3D preview should be rendered (mocked as div)
    const preview = screen.getByTestId('mujoco-preview');
    expect(preview).toBeTruthy();
  });

  it('shows camera discovery when modality is real', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Default modality is "real" — camera discovery should be present
    const cameraDiscovery = screen.getByTestId('camera-discovery');
    expect(cameraDiscovery).toBeTruthy();
  });

  it('hides camera discovery for simulated robots', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    await waitFor(() => {
      expect(robotModelsResource.list).toHaveBeenCalled();
    });

    // Select a simulated model
    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.mouseDown(modelSelect);
    const simOption = await screen.findByRole('option', { name: /Robot Model B/i });
    fireEvent.click(simOption);

    // Camera discovery should NOT be present for simulated robots
    expect(screen.queryByTestId('camera-discovery')).toBeNull();
  });
});
