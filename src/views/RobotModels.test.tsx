import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import RobotModelsView, { robotModelFields } from './RobotModels';
import { robotModelsTable, robotsTable } from '../db/schema';
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

describe('RobotModelsView', () => {
  beforeAll(async () => {
    (window as any).electronAPI = {
      getMigrations: async () => readMigrationFiles({ migrationsFolder: path.resolve(__dirname, '../../drizzle') })
    };
    await migrate();
  });

  beforeEach(async () => {
    await db.delete(robotsTable);
    await db.delete(robotModelsTable);
  });

  it('includes all RobotModel fields in the form config', () => {
    expect(robotModelFields.map((f) => f.name)).toEqual([
      'name',
      'dirName',
      'className',
      'configClassName',
      'properties',
      'modelXml',
      'modelPath',
      'modelFormat',
    ]);
  });

  it('should delete robot model and set robots.robotModelId to null', async () => {
    const model = await tableResource(robotModelsTable).create({
      name: 'Delete Model',
      dirName: 'delete_model',
      className: 'DeleteModelClass',
      configClassName: 'DeleteModelConfig',
      properties: {},
    });

    const robot = await tableResource(robotsTable).create({
      name: 'Robot Linked To Model',
      robotModelId: model.id,
    });

    render(<RobotModelsView />);
    await waitFor(() => screen.getByText('Delete Model'));

    const deleteIcon = await screen.findByTestId('DeleteIcon');
    fireEvent.click(deleteIcon.closest('button')!);

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Delete$/i }));

    await waitFor(async () => {
      const models = await tableResource(robotModelsTable).list();
      expect(models).toHaveLength(0);
    });

    const robots = await tableResource(robotsTable).list();
    expect(robots).toHaveLength(1);
    expect(robots[0].id).toBe(robot.id);
    expect(robots[0].robotModelId).toBeNull();
  });

  it('renders modality badges and robot metadata columns', async () => {
    await tableResource(robotModelsTable).create({
      name: 'Metadata Model',
      dirName: 'metadata_model',
      className: 'MetadataClass',
      configClassName: 'MetadataConfig',
      supportedModalities: ['real', 'simulated'],
      properties: {
        jointNames: ['j1', 'j2', 'j3'],
        actuatorNames: ['a1', 'a2'],
        hasGripper: true,
      },
    });

    render(<RobotModelsView />);

    await waitFor(() => {
      expect(screen.getByText('Metadata Model')).toBeTruthy();
      expect(screen.getByText('Joints')).toBeTruthy();
      expect(screen.getByText('Has Gripper')).toBeTruthy();
      expect(screen.getByText('Actuators')).toBeTruthy();
      expect(screen.getByText('real')).toBeTruthy();
      expect(screen.getByText('simulated')).toBeTruthy();
      expect(screen.getByText('Yes')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
    });
  });
});
