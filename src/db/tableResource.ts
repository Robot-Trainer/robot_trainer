import { db } from './db';
import { eq, getTableColumns, Table, sql } from 'drizzle-orm';

// Table is a drizzle pgTable instance
export function tableResource(table: Table) {
  return {
    list: async () => {
      const rows: any = await db.select().from(table);
      return rows || [];
    },
    create: async (item: any) => {
      // Filter out keys not in the table definition. 
      // If 'id' is in item, it should be included (for tables that support manual ID).
      // If 'id' is NOT in item, let the database handle it (defaults or identity).
      const columns = getTableColumns(table);
      const columnNames = Object.keys(columns);
      const insertObj: any = {};
      
      for (const c of columnNames) {
        if (Object.prototype.hasOwnProperty.call(item, c)) insertObj[c] = item[c];
      }

      if (
        columnNames.includes('id') &&
        !Object.prototype.hasOwnProperty.call(insertObj, 'id')
      ) {
        try {
          const maxIdRows = await db
            .select({ maxId: sql<number>`coalesce(max(${(table as any).id}), 0)` })
            .from(table as any);
          const nextId = Number(maxIdRows?.[0]?.maxId ?? 0) + 1;
          insertObj.id = nextId;
        } catch {
          // Fallback to DB default sequence behavior when max-id lookup fails.
        }
      }
      
      const [result] = await db.insert(table).values(insertObj as any).returning();
      return result;
    },
    update: async (id: string | number, item: any) => {
      const columns = getTableColumns(table);
      const cols = Object.keys(columns).filter((k) => k !== 'id');
      const updateObj: any = {};
      for (const c of cols) {
        if (Object.prototype.hasOwnProperty.call(item, c)) updateObj[c] = item[c];
      }
      const [result] = await db.update(table).set(updateObj).where(eq((table as any).id, id)).returning();
      return result;
    },
    delete: async (id: string | number) => {
      await db.delete(table).where(eq((table as any).id, id));
      return { ok: true };
    },
    table
  };
}
