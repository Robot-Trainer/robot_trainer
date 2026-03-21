import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import SkillsView from './Skills';
import { skillsTable, datasetsTable, scenesTable } from '../db/schema';
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
vi.mock('../lib/uiStore', () => ({ default: (cb: (state: Partial<import('../lib/uiStore').UIState>) => unknown) => cb({ resourceManagerShowForm: false, setResourceManagerShowForm: vi.fn() }) }));

describe('SkillsView Deletion', () => {
  beforeAll(async () => {
    (window as unknown as Record<string, unknown>).electronAPI = {
      getMigrations: async () => readMigrationFiles({ migrationsFolder: path.resolve(__dirname, '../../drizzle') })
    };
    await migrate();
  });

  beforeEach(async () => {
    await db.delete(datasetsTable);
    await db.delete(skillsTable);
    await db.delete(scenesTable);
  });

  it('should delete skill and set dataset skillId to null', async () => {
    const scene = await tableResource(scenesTable).create({ name: 'Scene' });
    const skill = await tableResource(skillsTable).create({ name: 'SkillToDelete' });
    const dataset = await tableResource(datasetsTable).create({
      name: 'DatasetWithSkill',
      sceneId: scene.id,
      skillId: skill.id
    });
    void dataset;

    render(<SkillsView />);
    await waitFor(() => screen.getByText('SkillToDelete'));

    const deleteIcon = await screen.findByTestId('DeleteIcon');
    fireEvent.click(deleteIcon.closest('button')!);

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Delete$/i }));

    await waitFor(async () => {
      const skills = await tableResource(skillsTable).list();
      expect(skills).toHaveLength(0);
    });

    const datasets = await tableResource(datasetsTable).list();
    expect(datasets).toHaveLength(1);
    expect(datasets[0].skillId).toBeNull();
  });
});

