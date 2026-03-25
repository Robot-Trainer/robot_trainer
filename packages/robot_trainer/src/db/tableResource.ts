import { db } from './db';
import { eq, getTableColumns, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import type { AnyPgTable, PgColumn } from 'drizzle-orm/pg-core';

function getIdColumn(table: AnyPgTable): PgColumn | undefined {
  const columns = getTableColumns(table);
  const maybeId = (columns as Record<string, PgColumn>).id;
  return maybeId;
}

// Table is a drizzle pgTable instance
export function tableResource<TTable extends AnyPgTable>(table: TTable) {
  type Row = InferSelectModel<TTable>;
  type Insert = Partial<InferInsertModel<TTable>>;

  return {
    list: async (): Promise<Row[]> => {
      const rows = await db.select().from(table);
      return rows || [];
    },
    create: async (item: Insert): Promise<Row> => {
      // Filter out keys not in the table definition. 
      // If 'id' is in item, it should be included (for tables that support manual ID).
      // If 'id' is NOT in item, let the database handle it (defaults or identity).
      const columns = getTableColumns(table);
      const columnNames = Object.keys(columns);
      const insertObj: Record<string, unknown> = {};
      
      for (const c of columnNames) {
        if (Object.prototype.hasOwnProperty.call(item, c)) {
          insertObj[c] = item[c as keyof Insert] as unknown;
        }
      }

      const idColumn = getIdColumn(table);
      if (
        idColumn &&
        !Object.prototype.hasOwnProperty.call(insertObj, 'id')
      ) {
        try {
          const maxIdRows = await db
            .select({ maxId: sql<number>`coalesce(max(${idColumn}), 0)` })
            .from(table);
          const nextId = Number(maxIdRows?.[0]?.maxId ?? 0) + 1;
          insertObj.id = nextId;
        } catch {
          // Fallback to DB default sequence behavior when max-id lookup fails.
        }
      }
      
      const [result] = await db.insert(table).values(insertObj as InferInsertModel<TTable>).returning();
      return result;
    },
    update: async (id: string | number, item: Insert): Promise<Row> => {
      const columns = getTableColumns(table);
      const cols = Object.keys(columns).filter((k) => k !== 'id');
      const updateObj: Record<string, unknown> = {};
      for (const c of cols) {
        if (Object.prototype.hasOwnProperty.call(item, c)) {
          updateObj[c] = item[c as keyof Insert] as unknown;
        }
      }

      const idColumn = getIdColumn(table);
      if (!idColumn) {
        throw new Error('Cannot update table without an id column');
      }

      const [result] = await db
        .update(table)
        .set(updateObj as InferInsertModel<TTable>)
        .where(eq(idColumn, id))
        .returning();
      return result;
    },
    delete: async (id: string | number): Promise<{ ok: true }> => {
      const idColumn = getIdColumn(table);
      if (!idColumn) {
        throw new Error('Cannot delete from table without an id column');
      }
      await db.delete(table).where(eq(idColumn, id));
      return { ok: true };
    },
    table,
    selectRecord: typeof table.$inferSelect,
    insertRecord: typeof table.$inferInsert,
  };
}
