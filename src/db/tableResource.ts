import { db } from './db';
import { eq, getTableColumns } from 'drizzle-orm';

// Table is a drizzle pgTable instance
export function tableResource(table: any) {
  return {
    list: async () => {
      const rows: any = await db.select().from(table);
      return rows || [];
    },
    create: async (item: any) => {
      const id = item.id || String(Date.now()) + Math.random().toString(36).slice(2);
      const columns = getTableColumns(table);
      const cols = Object.keys(columns).filter((k) => k !== 'id');
      const values: any = { ...item, id };
      // ensure only defined columns are inserted
      const insertObj: any = {};
      for (const c of cols.concat(['id'])) {
        if (Object.prototype.hasOwnProperty.call(values, c)) insertObj[c] = values[c];
      }
      const [result] = await db.insert(table).values(insertObj as any).returning();
      return result;
    },
    update: async (id: string, item: any) => {
      const columns = getTableColumns(table);
      const cols = Object.keys(columns).filter((k) => k !== 'id');
      const updateObj: any = {};
      for (const c of cols) {
        if (Object.prototype.hasOwnProperty.call(item, c)) updateObj[c] = item[c];
      }
      const [result] = await db.update(table).set(updateObj).where(eq(table.id, id)).returning();
      return result;
    },
    delete: async (id: string) => {
      await db.delete(table).where(eq(table.id, id));
      return { ok: true };
    }
  };
}
