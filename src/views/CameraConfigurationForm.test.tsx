import React from 'react';
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CameraConfigurationForm from './CameraConfigurationForm';
import { ToastProvider } from '../ui/ToastContext';
import { camerasResource } from '../db/resources';

// Mock the resources
vi.mock('../db/resources', () => ({
  camerasResource: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

describe('CameraConfigurationForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const mockCameras = [
    { id: 101, name: 'Cam 1', resolution: '1920x1080', fps: 30, modality: 'real' },
    { id: 102, name: 'Cam 2', resolution: '1280x720', fps: 60, modality: 'simulated' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (camerasResource.list as ReturnType<typeof vi.fn>).mockResolvedValue(mockCameras);
  });

  afterEach(() => {
    cleanup();
  });

  it('manages camera slots and saves configuration', async () => {
    render(
      <ToastProvider>
        <CameraConfigurationForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </ToastProvider>
    );

    // Wait for cameras to load
    await waitFor(() => {
      expect(camerasResource.list).toHaveBeenCalled();
    });

    // Should start with one empty slot labeled "Camera 1"
    const labels = screen.getAllByText('Camera 1');
    expect(labels.length).toBeGreaterThan(0);

    // Open first camera selector
    const firstCameraSelect = screen.getByLabelText('Camera 1');
    fireEvent.mouseDown(firstCameraSelect);

    // Dropdown should be open, showing camera options
    const cam1Option = await screen.findByRole('option', { name: 'Cam 1' });
    fireEvent.click(cam1Option);

    // Now trigger should show "Cam 1"
    expect(screen.getAllByText('Cam 1').length).toBeGreaterThan(0);

    // Add another camera
    const addBtn = screen.getByText(/\+ Add Another Camera/i);
    fireEvent.click(addBtn);

    // Should see Camera 2 label
    expect(screen.getAllByText('Camera 2').length).toBeGreaterThan(0);

    // Open second camera selector
    const secondCameraSelect = screen.getByLabelText('Camera 2');
    fireEvent.mouseDown(secondCameraSelect);

    // Select Cam 2
    const cam2Option = await screen.findByRole('option', { name: 'Cam 2' });
    fireEvent.click(cam2Option);

    // Save
    const saveBtn = screen.getByText(/Save Scene/i);
    fireEvent.click(saveBtn);

    expect(mockOnSave).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 101, name: 'Cam 1' }),
      expect.objectContaining({ id: 102, name: 'Cam 2' })
    ]));
    expect(mockOnSave.mock.calls[0][0]).toHaveLength(2);
  });

  it('removes a slot', async () => {
    render(
      <ToastProvider>
        <CameraConfigurationForm onSave={mockOnSave} onCancel={mockOnCancel} />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(camerasResource.list).toHaveBeenCalled();
    });

    // Add a second slot
    const addBtn = screen.getByText(/\+ Add Another Camera/i);
    fireEvent.click(addBtn);

    // Should see Camera 2 label
    await waitFor(() => {
      expect(screen.getAllByText('Camera 2').length).toBeGreaterThan(0);
    });

    // Find remove buttons (X)
    const removeBtns = screen.getAllByTitle('Remove Camera slot');
    fireEvent.click(removeBtns[1]);

    // Should only have 1 slot now
    await waitFor(() => {
      expect(screen.queryByText('Camera 2')).toBeNull();
    });
  });
});
