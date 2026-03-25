import React, { useState } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CameraSelectionDropdown } from './CameraSelectionDropdown';
import { CameraData } from '../types/camera';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const StatefulWrapper = ({ initialCameras, initialSelectedId }: { initialCameras: CameraData[], initialSelectedId: number | null }) => {
  const [cameras, setCameras] = useState<CameraData[]>(initialCameras);
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId);

  return (
    <CameraSelectionDropdown
      cameras={cameras}
      selectedCameraId={selectedId}
      onSelect={(id) => setSelectedId(id)}
      onCamerasChanged={setCameras}
      onRemove={(id) => {
        setCameras(cameras.filter(c => c.id !== id));
        if (selectedId === id) setSelectedId(null);
      }}
      label="Test Camera"
    />
  );
};

describe('CameraSelectionDropdown', () => {
  const mockCameras: CameraData[] = [
    {
      id: 1,
      name: 'RealCam1',
      modality: 'real',
      serialNumber: 'SN123',
      pose: { pos: [0,0,0], quat: [1,0,0,0], xyaxes: [1,0,0, 0,1,0] },
      isXml: false,
    },
    {
      id: 2,
      name: 'SimCam1',
      modality: 'simulated',
      resolution: '1920x1080',
      fps: 60,
      pose: { pos: [1,2,3], quat: [0,1,0,0], xyaxes: [0,1,0, 1,0,0] },
      isXml: false,
    },
    {
      id: 3,
      name: 'XmlCam1',
      modality: 'simulated',
      isXml: true,
      pose: { pos: [0,0,0], quat: [1,0,0,0], xyaxes: [1,0,0, 0,1,0] },
    },
  ];

  it('shows a disabled placeholder when selectedCameraId is not in the provided list and does not log MUI warnings', () => {
    const consolespy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CameraSelectionDropdown
        cameras={[{ id: -1234, name: 'XMLCam', isXml: true, modality: 'simulated', pose: { pos: [0,0,0], quat: [1,0,0,0], xyaxes: [1,0,0,0,1,0] } }]}
        selectedCameraId={2}
        onSelect={() => {}}
        onCamerasChanged={() => {}}
        label="Camera"
      />
    );

    expect(screen.getByText('Unknown camera (id: 2)')).toBeTruthy();
    expect(consolespy).not.toHaveBeenCalledWith(expect.stringContaining('out-of-range value'));

    consolespy.mockRestore();
  });

  it('displays selected camera with badge (real)', () => {
    render(<StatefulWrapper initialCameras={mockCameras} initialSelectedId={1} />);
    expect(screen.getByText('RealCam1')).toBeTruthy();
    expect(screen.getByText('real')).toBeTruthy();
  });

  it('displays selected camera with badge (simulated)', () => {
    render(<StatefulWrapper initialCameras={mockCameras} initialSelectedId={2} />);
    expect(screen.getByText('SimCam1')).toBeTruthy();
    expect(screen.getByText('simulated')).toBeTruthy();
  });

  it('displays selected camera with badge (xml)', () => {
    render(<StatefulWrapper initialCameras={mockCameras} initialSelectedId={3} />);
    expect(screen.getByText('XmlCam1')).toBeTruthy();
    expect(screen.getByText('xml')).toBeTruthy();
  });

  it('can open dropdown and select an existing camera', async () => {
    const user = userEvent.setup();
    render(<StatefulWrapper initialCameras={mockCameras} initialSelectedId={null} />);

    const select = screen.getByRole('combobox');
    await user.click(select);

    const option = screen.getByRole('option', { name: 'SimCam1' });
    await user.click(option);

    expect(screen.getByText('SimCam1')).toBeTruthy();
  });

  it('handles item remove click', async () => {
    const user = userEvent.setup();
    render(<StatefulWrapper initialCameras={mockCameras} initialSelectedId={1} />);

    const removeBtn = screen.getByTitle('Remove Camera slot');
    await user.click(removeBtn);

    // After removal, should not be found as selected text - actually wait, 
    // it's selectedId=null, so text RealCam1 should vanish
    expect(screen.queryByText('RealCam1')).toBeNull();
  });

  it('handles edit click and cancels', async () => {
    const user = userEvent.setup();
    render(<StatefulWrapper initialCameras={mockCameras} initialSelectedId={1} />);

    const editBtn = screen.getByTitle('Edit Camera Properties');
    await user.click(editBtn);

    expect(screen.getByText('Edit Real Camera')).toBeTruthy();

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);

    expect(screen.queryByText('Edit Real Camera')).toBeNull();
  });

  it('handles editing a real camera and saving', async () => {
    const user = userEvent.setup();
    render(<StatefulWrapper initialCameras={mockCameras} initialSelectedId={1} />);

    const editBtn = screen.getByTitle('Edit Camera Properties');
    await user.click(editBtn);

    const nameInputs = screen.getAllByRole('textbox');
    const nameInput = nameInputs[0];
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Real Cam');

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveBtn);

    expect(screen.queryByText('Edit Real Camera')).toBeNull();
    expect(screen.getByText('Updated Real Cam')).toBeTruthy();
  });

  it('handles editing a simulated camera and saving', async () => {
    const user = userEvent.setup();
    render(<StatefulWrapper initialCameras={mockCameras} initialSelectedId={2} />);

    const editBtn = screen.getByTitle('Edit Camera Properties');
    await user.click(editBtn);

    expect(screen.getByText('Edit Simulated Camera')).toBeTruthy();

    const nameInput = screen.getAllByRole('textbox')[0];
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Sim Cam');

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveBtn);

    expect(screen.queryByText('Edit Simulated Camera')).toBeNull();
    expect(screen.getByText('Updated Sim Cam')).toBeTruthy();
  });

  it('creates new real camera', async () => {
    const user = userEvent.setup();
    render(<StatefulWrapper initialCameras={mockCameras} initialSelectedId={null} />);

    const select = screen.getByRole('combobox');
    await user.click(select);

    const createOption = screen.getByRole('option', { name: /Create New Real Camera/i });
    await user.click(createOption);

    expect(screen.getByText('Edit Real Camera')).toBeTruthy();
  });

  it('creates new simulated camera', async () => {
    const user = userEvent.setup();
    render(<StatefulWrapper initialCameras={mockCameras} initialSelectedId={null} />);

    const select = screen.getByRole('combobox');
    await user.click(select);

    const createOption = screen.getByRole('option', { name: /Create New Simulated Camera/i });
    await user.click(createOption);

    expect(screen.getByText('Edit Simulated Camera')).toBeTruthy();
  });

  it('can edit a simulated camera resolution', async () => {
    const user = userEvent.setup();
    render(<StatefulWrapper initialCameras={mockCameras} initialSelectedId={2} />);

    const editBtn = screen.getByTitle('Edit Camera Properties');
    await user.click(editBtn);

    const resSelect = screen.getAllByRole('combobox')[0];
    await user.click(resSelect);

    const op480 = screen.getByRole('option', { name: /640x480/i });
    await user.click(op480);

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveBtn);
  });

  it('fills rest of the input coverage for pose params', async () => {
    const user = userEvent.setup();
    render(<StatefulWrapper initialCameras={mockCameras} initialSelectedId={2} />);

    const editBtn = screen.getByTitle('Edit Camera Properties');
    await user.click(editBtn);

    const fpBoxes = screen.getAllByRole('spinbutton');
    const posXBox = fpBoxes.find(b => b.getAttribute('placeholder') === 'POS X');
    const posYBox = fpBoxes.find(b => b.getAttribute('placeholder') === 'POS Y');
    const posZBox = fpBoxes.find(b => b.getAttribute('placeholder') === 'POS Z');
    const quatWBox = fpBoxes.find(b => b.getAttribute('placeholder') === 'QUAT W');
    const quatXBox = fpBoxes.find(b => b.getAttribute('placeholder') === 'QUAT X');
    const quatYBox = fpBoxes.find(b => b.getAttribute('placeholder') === 'QUAT Y');
    const quatZBox = fpBoxes.find(b => b.getAttribute('placeholder') === 'QUAT Z');
    const xyaxesX1Box = fpBoxes.find(b => b.getAttribute('placeholder') === 'X1');
    const xyaxesY1Box = fpBoxes.find(b => b.getAttribute('placeholder') === 'Y1');
    const xyaxesZ1Box = fpBoxes.find(b => b.getAttribute('placeholder') === 'Z1');
    const xyaxesX2Box = fpBoxes.find(b => b.getAttribute('placeholder') === 'X2');
    const xyaxesY2Box = fpBoxes.find(b => b.getAttribute('placeholder') === 'Y2');
    const xyaxesZ2Box = fpBoxes.find(b => b.getAttribute('placeholder') === 'Z2');

    const update = async (input: Element | undefined) => { if(input) { await user.clear(input); await user.type(input, '7'); } };
    
    await update(posXBox);
    await update(posYBox);
    await update(posZBox);
    await update(quatWBox);
    await update(quatXBox);
    await update(quatYBox);
    await update(quatZBox);
    await update(xyaxesX1Box);
    await update(xyaxesY1Box);
    await update(xyaxesZ1Box);
    await update(xyaxesX2Box);
    await update(xyaxesY2Box);
    await update(xyaxesZ2Box);

    // change FPS as well
    const inputBoxesForFPS = screen.getAllByRole('spinbutton');
    // sometimes MUI adds the label around it, let's just use the first spinbutton not bound to a placeholder
    const possiblyFps = inputBoxesForFPS.find(b => !b.getAttribute('placeholder'));
    if (possiblyFps) {
      await user.clear(possiblyFps);
      await user.type(possiblyFps, '1337');
    }

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveBtn);
  });
});
