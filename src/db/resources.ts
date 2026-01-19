import { db } from './db';
import { userConfigTable, robotModelsTable, teleoperatorModelsTable, robotsTable, camerasTable } from './schema';
import { tableResource } from './tableResource';

export const robotModelsResource = tableResource(robotModelsTable);
export const teleoperatorModelsResource = tableResource(teleoperatorModelsTable);
export const robotsResource = tableResource(robotsTable);
export const camerasResource = tableResource(camerasTable);

export const configResource = {
  getAll: async () => {
    const rows: any = await db.select().from(userConfigTable).limit(1);
    return (rows[0] && rows[0].config) ? rows[0].config : {};
  },
  setAll: async (cfg: any) => {
    const rows: any = await db.select().from(userConfigTable).limit(1);
    if (rows.length === 0) {
      await db.insert(userConfigTable).values({ config: cfg });
    } else {
      await db.update(userConfigTable).set({ config: cfg }).where(userConfigTable.id.eq(rows[0].id));
    }
    return { ok: true };
  },
  getKey: async (key: string) => {
    const cfg = await (configResource as any).getAll();
    if (!key) return cfg;
    const parts = key.split('.');
    let cur: any = cfg;
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
      else { cur = undefined; break; }
    }
    return cur;
  },
  setKey: async (key: string, value: any) => {
    const cfg = await (configResource as any).getAll();
    if (!key) {
      await (configResource as any).setAll(value || {});
      return { ok: true };
    }
    const parts = key.split('.');
    let o: any = cfg || {};
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!o[p] || typeof o[p] !== 'object') o[p] = {};
      o = o[p];
    }
    o[parts[parts.length - 1]] = value;
    await (configResource as any).setAll(cfg);
    return { ok: true };
  }
};
