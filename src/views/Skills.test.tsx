import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import SkillsView from './Skills';
import { skillsTable, sessionsTable, scenesTable } from '../db/schema';
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

describe('SkillsView Deletion', () => {
  beforeAll(async () => {
    (window as any).electronAPI = {
      getMigrations: async () => readMigrationFiles({ migrationsFolder: path.resolve(__dirname, '../../drizzle') })
    };
    await migrate();
  });

  beforeEach(async () => {
    await db.delete(sessionsTable);
    await db.delete(skillsTable);
    await db.delete(scenesTable);
  });

  it('should delete skill and set session skillId to null', async () => {
    const scene = await tableResource(scenesTable).create({ name: 'Scene' });
    const skill = await tableResource(skillsTable).create({ name: 'SkillToDelete' });
    const session = await tableResource(sessionsTable).create({
      name: 'SessionWithSkill',
      sceneId: scene.id,
      skillId: skill.id
    });

    render(<SkillsView />);
    await waitFor(() => screen.getByText('SkillToDelete'));

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(async () => {
      const skills = await tableResource(skillsTable).list();
      expect(skills).toHaveLength(0);
    });

    const sessions = await tableResource(sessionsTable).list();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].skillId).toBeNull();
  });
});

