import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import ScenesView from './Scenes';
import { scenesTable } from '../db/schema';
import { db } from '../db/db';

// Mock dependencies
vi.mock('../db/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => Promise.resolve([])), // default empty list
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 1, name: 'Scene 1' }])),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

vi.mock('../ui/ToastContext', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));

vi.mock('../lib/uiStore', () => ({
  default: (cb: any) => cb({
    resourceManagerShowForm: false,
    setResourceManagerShowForm: vi.fn(),
  }),
}));

describe('ScenesView', () => {
  it('renders correctly', async () => {
    render(<ScenesView />);
    expect(screen.getByText('Scenes')).toBeDefined();
    // Verify add button exists (resource manager standard)
    expect(screen.getByRole('button', { name: /Add/i })).toBeDefined();
  });

  it('lists scenes', async () => {
    // Override mock implementation for list
    (db.select as any).mockReturnValue({
      from: vi.fn().mockResolvedValue([
        { id: 1, name: 'Test Scene', description: 'Description' },
        { id: 2, name: 'Another Scene', description: '' }
      ]),
    });

    render(<ScenesView />);
    await waitFor(() => {
      expect(screen.getByText('Test Scene')).toBeDefined();
      expect(screen.getByText('Another Scene')).toBeDefined();
    });
  });
});
