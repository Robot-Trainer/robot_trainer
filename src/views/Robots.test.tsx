import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import RobotsView from './Robots';
import { robotsTable, sceneRobotsTable, scenesTable } from '../db/schema';
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

describe('RobotsView Deletion', () => {
  beforeAll(async () => {
    (window as any).electronAPI = {
      getMigrations: async () => readMigrationFiles({ migrationsFolder: path.resolve(__dirname, '../../drizzle') })
    };
    await migrate();
  });

  beforeEach(async () => {
    await db.delete(sceneRobotsTable);
    await db.delete(robotsTable);
    await db.delete(scenesTable);
  });

  it('should delete robot and cascade to scene_robots', async () => {
    const robot = await tableResource(robotsTable).create({ name: 'RoboDelete' });
    const scene = await tableResource(scenesTable).create({ name: 'SceneDelete' });
    await tableResource(sceneRobotsTable).create({
      sceneId: scene.id,
      robotId: robot.id,
      snapshot: {}
    });

    render(<RobotsView />);
    await waitFor(() => screen.getByText('RoboDelete'));
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(async () => {
      const robots = await tableResource(robotsTable).list();
      expect(robots).toHaveLength(0);
    });
    const links = await tableResource(sceneRobotsTable).list();
    expect(links).toHaveLength(0);
  });
});
