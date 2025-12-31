import { db } from './db';

// Table is a drizzle pgTable instance
export function tableResource(table: any) {
  return {
    list: async () => {
      const rows: any = await db.select().from(table);
      return rows || [];
    },
    create: async (item: any) => {
      const id = item.id || String(Date.now()) + Math.random().toString(36).slice(2);
      const cols = Object.keys(table.columns || {}).filter((k) => k !== 'id');
      const values: any = { ...item, id };
      // ensure only defined columns are inserted
      const insertObj: any = {};
      for (const c of cols.concat(['id'])) {
        if (Object.prototype.hasOwnProperty.call(values, c)) insertObj[c] = values[c];
      }
      await db.insert(table).values(insertObj as any);
      return { ...item, id };
    },
    update: async (id: string, item: any) => {
      const cols = Object.keys(table.columns || {}).filter((k) => k !== 'id');
      const updateObj: any = {};
      for (const c of cols) {
        if (Object.prototype.hasOwnProperty.call(item, c)) updateObj[c] = item[c];
      }
      await db.update(table).set(updateObj).where(table.id.eq(id));
      return { ...item, id };
    },
    delete: async (id: string) => {
      await db.delete(table).where(table.id.eq(id));
      return { ok: true };
    }
  };
}
