import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import CamerasView from './Cameras';
import { camerasTable, sceneCamerasTable, scenesTable } from '../db/schema';
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

describe('CamerasView Deletion', () => {
  beforeAll(async () => {
    (window as any).electronAPI = {
      getMigrations: async () => readMigrationFiles({ migrationsFolder: path.resolve(__dirname, '../../drizzle') })
    };
    await migrate();
  });

  beforeEach(async () => {
    await db.delete(sceneCamerasTable);
    await db.delete(camerasTable);
    await db.delete(scenesTable);
  });

  it('should delete camera and cascade to scene_cameras', async () => {
    const camera = await tableResource(camerasTable).create({ name: 'CamDelete' });
    const scene = await tableResource(scenesTable).create({ name: 'SceneDelete' });
    await tableResource(sceneCamerasTable).create({
      sceneId: scene.id,
      cameraId: camera.id,
      snapshot: {}
    });

    render(<CamerasView />);
    await waitFor(() => screen.getByText('CamDelete'));

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(async () => {
      const cams = await tableResource(camerasTable).list();
      expect(cams).toHaveLength(0);
    });

    const links = await tableResource(sceneCamerasTable).list();
    expect(links).toHaveLength(0);
  });
});
