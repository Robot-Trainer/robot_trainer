import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RobotSelectionDropdown } from './RobotSelectionDropdown';

describe('RobotSelectionDropdown', () => {
  it('renders a disabled placeholder for an unknown selected robot and avoids MUI warnings', () => {
    const consolespy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <RobotSelectionDropdown
        robots={[{ id: 1, name: 'Robo1', modality: 'simulated' }]}
        connectedDevices={[]}
        availableModels={[]}
        selectedRobotId={999}
        onSelect={() => {}}
        onRobotsChanged={() => {}}
        label="Follower Robot"
      />
    );

    expect(screen.getByText('Unknown robot (id: 999)')).toBeInTheDocument();
    expect(consolespy).not.toHaveBeenCalledWith(expect.stringContaining('out-of-range value'));

    consolespy.mockRestore();
  });
});
