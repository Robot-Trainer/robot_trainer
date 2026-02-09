import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SessionsView from './Sessions';

// Mock tableResource to prevent database calls
vi.mock('../db/tableResource', () => ({
  tableResource: () => ({
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })
}));

// Mock electronAPI if used in SessionForm
Object.defineProperty(window, 'electronAPI', {
  value: {
    startSimulation: vi.fn(),
    stopSimulation: vi.fn(),
    onSimulationStopped: vi.fn(() => () => { /* no-op */ }),
  },
  writable: true
});

describe('SessionsView', () => {
  it('renders list and allows navigating to form', async () => {
    render(<SessionsView />);

    // Check initial list state
    expect(await screen.findByText('Sessions')).toBeDefined();
    expect(await screen.findByText('No sessions defined')).toBeDefined();

    // Click Add button (ResourceManager renders "Add Session")
    // Note: There are two buttons, one in header (Add Session) and one in empty state (Add a Session)
    // We target the one in the header usually, or just by text.
    const addButtons = screen.getAllByText('Add Session');
    expect(addButtons.length).toBeGreaterThan(0);
    fireEvent.click(addButtons[0]);

    // Check if SessionForm appears (it renders "Session Studio")
    expect(await screen.findByText('Session Name')).toBeDefined();

    // Check for Back button and click it
    const backButton = screen.getByText('← Back');
    fireEvent.click(backButton);

    // Should be back to list view
    expect(await screen.findByText('No sessions defined')).toBeDefined();
  });
});
