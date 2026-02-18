import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CameraSelectionDropdown } from './CameraSelectionDropdown';

describe('CameraSelectionDropdown', () => {
  it('shows a disabled placeholder when selectedCameraId is not in the provided list and does not log MUI warnings', () => {
    const consolespy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CameraSelectionDropdown
        cameras={[{ id: -1234, name: 'XMLCam', isXml: true, modality: 'simulated' }]}
        selectedCameraId={2}
        onSelect={() => {}}
        onCamerasChanged={() => {}}
        label="Camera"
      />
    );

    expect(screen.getByText('Unknown camera (id: 2)')).toBeInTheDocument();
    expect(consolespy).not.toHaveBeenCalledWith(expect.stringContaining('out-of-range value'));

    consolespy.mockRestore();
  });
});
