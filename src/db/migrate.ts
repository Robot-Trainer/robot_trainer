import { sql } from "drizzle-orm";
import type { MigrationConfig } from "drizzle-orm/migrator";
import { db, client } from "./db";
// import migrations from './migrations.json';


export async function migrate() {
    // dialect and session will appear to not exist...but they do
    if (typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.getMigrations) {
        const migrations = await window.electronAPI.getMigrations();
        if (!client.ready) await client.waitReady;
        await db.dialect.migrate(migrations, db.session, {
            migrationsTable: "__drizzle_migrations",
            migrationsSchema: "public",
        } as Omit<MigrationConfig, "migrationsFolder">);
    } else {
        console.error("Cannot run migrations in non-electron environment without file access via IPC");

    }
}

export type MigrationStatus =
    | { type: 'synced' }
    | { type: 'pending', pending: any[], fresh?: boolean }
    | { type: 'corrupted', error: any };

export async function checkMigrationStatus(): Promise<MigrationStatus> {
    if (!client.ready) await client.waitReady;

    let migrationList: any[] = [];
    if (typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.getMigrations) {
        migrationList = await window.electronAPI.getMigrations();
    }

    try {
        // Simple aliveness check
        await db.execute(sql`SELECT 1`);

        let appliedHashes = new Set<string>();
        try {
            const result = await db.execute(sql`SELECT hash FROM public.__drizzle_migrations ORDER BY created_at ASC`);
            appliedHashes = new Set(result.rows.map((r: any) => r.hash));
        } catch (e: any) {
            const msg = e?.message || String(e);
            // Check for "relation does not exist" error (Postgres code 42P01)
            // This means the migration table hasn't been created yet -> fresh DB.
            if (e?.code === '42P01' || e?.cause?.code === '42P01' || /relation.*does not exist/i.test(msg) || /relation.*does not exist/i.test(JSON.stringify(e))) {
                if (migrationList.length > 0) {
                    return { type: 'pending', pending: migrationList, fresh: true };
                }
                return { type: 'synced' };
            }
            throw e;
        }

        // Find pending
        const pending = migrationList.filter(m => !appliedHashes.has(m.hash));

        if (pending.length > 0) {
            return { type: 'pending', pending };
        }

        return { type: 'synced' };

    } catch (e) {
        console.error("Migration check failed", e);
        return { type: 'corrupted', error: e };
    }
}

export async function resetDatabase() {
    console.log("Resetting database...");
    return new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase("robot-trainer");
        req.onsuccess = () => {
            console.log("Database deleted successfully");
            resolve();
        };
        req.onerror = () => {
            console.error("Database delete failed", req.error);
            reject(req.error);
        };
        req.onblocked = () => {
            console.warn("Delete blocked");
        };
    });
}
