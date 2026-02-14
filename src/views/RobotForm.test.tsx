import React from 'react';
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RobotForm from './RobotForm';
import { robotModelsResource } from '../db/resources';

// Mock the resources
vi.mock('../db/resources', () => ({
  robotModelsResource: {
    list: vi.fn(),
  },
}));

describe('RobotForm', () => {
  const mockOnSaved = vi.fn();
  const mockOnCancel = vi.fn();

  const mockRobotModels = [
    { id: 1, name: 'Robot Model A', modality: 'real' },
    { id: 2, name: 'Robot Model B', modality: 'simulated' },
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

    // 2. Wait for options to populate and select one
    const modelOption = await screen.findByText('Robot Model A');
    fireEvent.click(modelOption);

    // Select Modality
    const modalitySelectTrigger = screen.getByLabelText(/Modality/i);
    fireEvent.mouseDown(modalitySelectTrigger);
    const modalityOption = await screen.findByText('Real');
    fireEvent.click(modalityOption);

    // Connect Device
    // We can select from the scanned list (which we triggered scan for)
    // or type manually. The scanned list items are clickable.
    const deviceCard = await screen.findByText(/SerialNumber1/);
    fireEvent.click(deviceCard);
    
    // Or if we want to test manual input:
    // const deviceInput = screen.getByLabelText(/Connected Device Serial/i);
    // fireEvent.change(deviceInput, { target: { value: 'SerialNumber1' } });

    // Save
    const saveBtn = screen.getByText(/Save Robot/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: 'My Test Robot',
        robotModelId: 1,
        modality: 'real',
        serialNumber: 'SerialNumber1',
        data: { type: 'real' }
      }));
    });
  });

  it('handles simulated robot setup', async () => {
    render(<RobotForm onSaved={mockOnSaved} />);

    // Change modality to Simulated
    const modalitySelect = screen.getByLabelText(/Modality/i);
    fireEvent.change(modalitySelect, { target: { value: 'simulated' } });

    // Device select should disappear
    const connectedDevice = screen.queryByLabelText(/Connected Device/i);
    expect(connectedDevice).toBeNull();

    const nameInput = screen.getByLabelText(/Robot Name/i);
    fireEvent.change(nameInput, { target: { value: 'Sim Robot' } });

    // Select Robot Model
    // Wait for options to populate
    await waitFor(() => expect(screen.getByText('Robot Model B')).not.toBeNull());

    const modelSelect = screen.getByLabelText(/Robot Model/i);
    fireEvent.change(modelSelect, { target: { value: '2' } });

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
});
