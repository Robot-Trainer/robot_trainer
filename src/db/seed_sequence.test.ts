import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { robotModelsTable } from './schema';
import { seedRobotModels } from './seed_robot_models';
import { migrate } from './migrate';
import { db } from './db';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import path from 'node:path';
import { sql } from 'drizzle-orm';

vi.mock('./db', async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite();
  const db = drizzle(client);
  return {
    db: Object.assign(db, {
      ready: true,
      waitReady: Promise.resolve(),
    }),
    client
  };
});

describe('Seeding and Sequence Check', () => {
  beforeAll(async () => {
    (window as any).electronAPI = {
      getMigrations: async () => {
        return readMigrationFiles({ migrationsFolder: path.resolve(__dirname, '../../drizzle') });
      }
    };
    await migrate();
  });

  afterEach(async () => {
    await db.delete(robotModelsTable);
    // Reset sequence to clean state? difficult in shared db.
    // We'll rely on fresh run behavior mostly.
  });

  it('should successfully insert new model after seeding', async () => {
    // 1. Run Seed (inserts IDs 1-12)
    await seedRobotModels();

    // 2. Try to insert new model relying on auto-generated ID
    const newModel = {
      name: "Test Custom Model",
      dirName: "custom",
      className: "TestClass",
      configClassName: "TestConfig",
    };

    // This is expected to fail if sequence is not updated
    await db.insert(robotModelsTable).values(newModel);

    // 3. Verify
    const rows = await db.select().from(robotModelsTable);
    const inserted = rows.find(r => r.name === "Test Custom Model");
    expect(inserted).toBeDefined();
    // Since we seeded 1-12, the next valid ID should be 13, but definitely > 12.
    // If sequence wasn't updated, it would try 1, which exists.
    expect(inserted!.id).toBeGreaterThan(12);
  });
});
