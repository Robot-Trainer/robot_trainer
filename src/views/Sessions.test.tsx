import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import SessionsView from './Sessions';
import { sessionsTable, episodesTable, scenesTable } from '../db/schema';
import { tableResource } from '../db/tableResource';
import { migrate } from '../db/migrate';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import path from 'node:path';
import { db } from '../db/db';

vi.mock('../db/db', async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite();
  const db = drizzle(client);
  Object.assign(db, { ready: true, waitReady: Promise.resolve() });
  return { db, client };
});

vi.mock('../ui/ToastContext', () => ({ useToast: () => ({ error: vi.fn(), success: vi.fn() }) }));
vi.mock('../lib/uiStore', () => ({ default: (cb: any) => cb({ resourceManagerShowForm: false, setResourceManagerShowForm: vi.fn() }) }));

describe('SessionsView Deletion', () => {
  beforeAll(async () => {
    (window as any).electronAPI = {
      getMigrations: async () => readMigrationFiles({ migrationsFolder: path.resolve(__dirname, '../../drizzle') }),
      getRobotModels: async () => [],
    };
    await migrate();
  });

  beforeEach(async () => {
    await db.delete(episodesTable);
    await db.delete(sessionsTable);
    await db.delete(scenesTable);
  });

  it('should delete session and cascade episodes', async () => {
    const scene = await tableResource(scenesTable).create({ name: 'Scene1' });
    const session = await tableResource(sessionsTable).create({
      name: 'SessionToDelete',
      sceneId: scene.id
    });
    await tableResource(episodesTable).create({
        name: 'Ep1',
        sessionId: session.id
    });

    render(<SessionsView />);
    await waitFor(() => screen.getByText('SessionToDelete'));

    const deleteIcon = await screen.findByTestId('DeleteIcon');
    fireEvent.click(deleteIcon.closest('button')!);

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Delete$/i }));

    await waitFor(async () => {
      const sessions = await tableResource(sessionsTable).list();
      expect(sessions).toHaveLength(0);
    });

    const eps = await tableResource(episodesTable).list();
    expect(eps).toHaveLength(0);
  });
});
