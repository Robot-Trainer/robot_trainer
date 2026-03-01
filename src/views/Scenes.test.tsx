import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import ScenesView from './Scenes';
import { scenesTable } from '../db/schema';
import { tableResource } from '../db/tableResource';
import { migrate } from '../db/migrate';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import path from 'node:path';
import { db } from '../db/db';

vi.mock('../db/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const client = new PGlite();
  const db = drizzle(client);
  Object.assign(db, { ready: true, waitReady: Promise.resolve() });
  return { db, client };
});

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
  beforeAll(async () => {
    (window as any).electronAPI = {
      getMigrations: async () => readMigrationFiles({ migrationsFolder: path.resolve(__dirname, '../../drizzle') }),
    };
    await migrate();
  });

  beforeEach(async () => {
    await db.delete(scenesTable);
  });

  it('renders correctly', async () => {
    render(<ScenesView />);
    expect(screen.getByText('Scenes')).toBeDefined();
    // Verify add button exists (resource manager standard)
    expect(screen.getByRole('button', { name: /Add/i })).toBeDefined();
  });

  it('lists scenes', async () => {
    await tableResource(scenesTable).create({ name: 'Test Scene' });
    await tableResource(scenesTable).create({ name: 'Another Scene' });

    render(<ScenesView />);
    await waitFor(() => {
      expect(screen.getByText('Test Scene')).toBeDefined();
      expect(screen.getByText('Another Scene')).toBeDefined();
    });
  });
});
