import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { tableResource } from './tableResource';
import { camerasTable, teleoperatorModelsTable } from './schema';
import { migrate } from './migrate';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import path from 'node:path';

// Mock the db module to use an in-memory PGlite instance
vi.mock('./db', async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");

  // Create an in-memory PGlite instance
  const client = new PGlite();
  const db = drizzle(client);

  // Add properties that might be expected by migrate.ts or other consumers
  // Although standard drizzle instance doesn't have ready/waitReady, migrate.ts checks for them.
  return {
    db: Object.assign(db, {
      ready: true,
      waitReady: Promise.resolve(),
    }),
    client
  };
});

describe('tableResource', () => {
  const resource = tableResource(camerasTable);

  beforeAll(async () => {
    // Mock the electronAPI for migrations
    (window as any).electronAPI = {
      getMigrations: async () => {
        return readMigrationFiles({ migrationsFolder: path.resolve(__dirname, '../../drizzle') });
      }
    };

    // Run migrations to set up the schema in the in-memory DB
    await migrate();
  });

  beforeEach(async () => {
    // Clear the table before each test
    await db.delete(camerasTable);
  });

  it('list() should return an empty array initially', async () => {
    const list = await resource.list();
    expect(list).toEqual([]);
  });

  it('create() should insert a new item and return it with an id', async () => {
    const newCamera = {
      name: 'Test Camera',
      resolution: '1920x1080',
      fps: 30,
      data: { location: 'Lab 1' }
    };

    const created = await resource.create(newCamera);

    expect(created).toMatchObject(newCamera);
    expect(created.id).toBeDefined();
    expect(typeof created.id).toBe('number');

    // Verify it's in the database
    const list = await resource.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject(created);
  });

  it('create() should handle provided id (using teleoperatorModelsTable)', async () => {
    // teleoperatorModelsTable uses integer identity
    const resourceT = tableResource(teleoperatorModelsTable);
    await db.delete(teleoperatorModelsTable);

    const id = 999;
    // configClassName is required
    const newItem = {
      id,
      className: 'Fixed ID Teleop',
      configClassName: 'FixedConfig'
    };

    const created = await resourceT.create(newItem);
    expect(created.id).toBe(id);

    const list = await resourceT.list();
    expect(list[0].id).toBe(id);
  });

  it('update() should modify an existing item', async () => {
    // Create first
    const newCamera = { name: 'Old Name', resolution: '720p' };
    const created = await resource.create(newCamera);

    // Update
    const updateData = { name: 'New Name' };
    const updated = await resource.update(created.id, updateData);

    expect(updated.name).toBe('New Name');
    expect(updated.resolution).toBe('720p'); // Should persist
    expect(updated.id).toBe(created.id);

    // Verify in DB
    const list = await resource.list();
    expect(list[0].name).toBe('New Name');
  });

  it('delete() should remove an item', async () => {
    // Create first
    const created = await resource.create({ name: 'To Be Deleted' });

    // Verify existence
    let list = await resource.list();
    expect(list).toHaveLength(1);

    // Delete
    const result = await resource.delete(created.id);
    expect(result).toEqual({ ok: true });

    // Verify removal
    list = await resource.list();
    expect(list).toHaveLength(0);
  });

  it('create() should filter out extraneous fields not in the schema', async () => {
    // Note: tableResource.ts implementation filters columns based on table.columns
    // We want to ensure passed-in extra props don't crash the insert or end up in DB (if strict)
    // Drizzle usually ignores extras but tableResource does explicit filtering.

    const cameraWithExtras = {
      name: 'Extra Field Cam',
      extraProperty: 'Should be ignored'
    };

    // The create method returns {...item, id}, so it might return the extra property back in the object 
    // even if it wasn't inserted. Let's check the implementation of tableResource create return.
    // It returns { ...item, id }. So checks on the return value will see extraProperty.
    // We should check the DB list result.

    const created = await resource.create(cameraWithExtras);
    expect(created.extraProperty).toBeUndefined();

    const list = await resource.list();
    const fetchedItem = list[0];

    // The fetched item should NOT have extraProperty
    expect(fetchedItem).not.toHaveProperty('extraProperty');
    expect(fetchedItem.name).toBe('Extra Field Cam');
  });
});
