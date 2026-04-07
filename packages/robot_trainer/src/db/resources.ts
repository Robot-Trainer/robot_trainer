import { db } from './db';
import { userConfigTable, robotModelsTable, robotsTable, scenesTable, sceneRobotsTable } from './schema';
import { tableResource } from './tableResource';
import { eq, sql } from 'drizzle-orm';
import type { JsonObject, JsonValue } from '../types/json';

export const robotModelsResource = tableResource(robotModelsTable);
export const robotsResource = tableResource(robotsTable);

export const scenesResource = {
  ...tableResource(scenesTable),
  list: async () => {
    return await db.select({
      id: scenesTable.id,
      name: scenesTable.name,
      notes: scenesTable.notes,
      sceneXmlPath: scenesTable.sceneXmlPath,
      createdAt: scenesTable.createdAt,
      robotName: robotsTable.name,
      robotModality: robotsTable.modality,
      cameraCount: sql<number>`COALESCE(jsonb_array_length((${scenesTable.data})::jsonb -> 'cameras'), 0)`.mapWith(Number)
    })
    .from(scenesTable)
    .leftJoin(sceneRobotsTable, eq(scenesTable.id, sceneRobotsTable.sceneId))
    .leftJoin(robotsTable, eq(sceneRobotsTable.robotId, robotsTable.id))
    .execute();
  }
};

export const configResource = {
  getAll: async (): Promise<JsonObject> => {
    const rows = await db.select().from(userConfigTable).limit(1);
    const cfg = rows[0]?.config;
    return isJsonObject(cfg) ? cfg : {};
  },
  setAll: async (cfg: JsonObject): Promise<{ ok: true }> => {
    const rows = await db.select().from(userConfigTable).limit(1);
    if (rows.length === 0) {
      await db.insert(userConfigTable).values({ config: cfg });
    } else {
      await db.update(userConfigTable).set({ config: cfg }).where(eq(userConfigTable.id, rows[0].id));
    }
    return { ok: true };
  },
  getKey: async (key: string): Promise<JsonValue | JsonObject | undefined> => {
    const cfg = await configResource.getAll();
    if (!key) return cfg;
    const parts = key.split('.');
    let cur: JsonValue | JsonObject | undefined = cfg;
    for (const p of parts) {
      if (isJsonObject(cur) && Object.prototype.hasOwnProperty.call(cur, p)) {
        cur = cur[p];
      } else {
        cur = undefined;
        break;
      }
    }
    return cur;
  },
  setKey: async (key: string, value: JsonValue | JsonObject): Promise<{ ok: true }> => {
    const cfg = await configResource.getAll();
    if (!key) {
      await configResource.setAll(isJsonObject(value) ? value : {});
      return { ok: true };
    }

    const parts = key.split('.');
    let o: JsonObject = cfg;

    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      const next = o[p];
      if (!isJsonObject(next)) {
        o[p] = {};
      }
      o = o[p] as JsonObject;
    }

    o[parts[parts.length - 1]] = value;
    await configResource.setAll(cfg);
    return { ok: true };
  }
};

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
