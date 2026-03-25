import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { migrate, checkMigrationStatus, resetDatabase } from './migrate';
import { db, client } from './db';

vi.mock('drizzle-orm', () => ({
  sql: vi.fn((strings, ...args) => ({ strings, args }))
}));

vi.mock('./db', () => ({
  client: { ready: false, waitReady: Promise.resolve() },
  db: {
    dialect: { migrate: vi.fn() },
    session: {},
    execute: vi.fn(),
  },
}));

describe('migrate.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('console', { log: vi.fn(), warn: vi.fn(), error: vi.fn() });
    client.ready = true;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('migrate', () => {
    it('runs migrations in electron environment', async () => {
      const getMigrations = vi.fn().mockResolvedValue([{ hash: 'hash1', sql: 'sql1' }]);
      vi.stubGlobal('window', { electronAPI: { getMigrations } });
      await migrate();
      expect(db.dialect.migrate).toHaveBeenCalledWith([{ hash: 'hash1', sql: 'sql1' }], db.session, {
        migrationsTable: '__drizzle_migrations',
        migrationsSchema: 'public',
      });
      expect(getMigrations).toHaveBeenCalled();
    });

    it('waits for client ready if not ready', async () => {
      const getMigrations = vi.fn().mockResolvedValue([]);
      client.ready = false;
      const waitReadySpy = vi.fn().mockResolvedValue(undefined);
      client.waitReady = waitReadySpy();
      
      vi.stubGlobal('window', { electronAPI: { getMigrations } });
      await migrate();
      expect(waitReadySpy).toHaveBeenCalled();
    });

    it('logs error if not in electron environment', async () => {
      vi.stubGlobal('window', { electronAPI: undefined });
      const errorSpy = vi.spyOn(console, 'error');
      await migrate();
      expect(errorSpy).toHaveBeenCalledWith("Cannot run migrations in non-electron environment without file access via IPC");
    });
  });

  describe('checkMigrationStatus', () => {
    beforeEach(() => {
        client.ready = true;
    });

    it('returns synced if no pending migrations', async () => {
      vi.stubGlobal('window', { electronAPI: { getMigrations: vi.fn().mockResolvedValue([{ hash: 'h1' }]) } });
      vi.mocked(db.execute)
        .mockResolvedValueOnce(undefined as unknown) // SELECT 1
        .mockResolvedValueOnce({ rows: [{ hash: 'h1' }] } as unknown); // SELECT hash
      
      const res = await checkMigrationStatus();
      expect(res).toEqual({ type: 'synced' });
    });

    it('returns pending if there are unapplied migrations', async () => {
      vi.stubGlobal('window', { electronAPI: { getMigrations: vi.fn().mockResolvedValue([{ hash: 'h1' }, { hash: 'h2' }]) } });
      vi.mocked(db.execute)
        .mockResolvedValueOnce(undefined as unknown) // SELECT 1
        .mockResolvedValueOnce({ rows: [{ hash: 'h1' }] } as unknown); // SELECT hash

      const res = await checkMigrationStatus();
      expect(res).toEqual({ type: 'pending', pending: [{ hash: 'h2' }] });
    });

    it('handles relation does not exist error (code 42P01) indicating fresh db', async () => {
      vi.stubGlobal('window', { electronAPI: { getMigrations: vi.fn().mockResolvedValue([{ hash: 'h1' }]) } });
      const err = new Error('relation does not exist');
      (err as { code: string }).code = '42P01';
      
      vi.mocked(db.execute)
        .mockResolvedValueOnce(undefined as unknown) // SELECT 1
        .mockRejectedValueOnce(err); // SELECT hash

      const res = await checkMigrationStatus();
      expect(res).toEqual({ type: 'pending', pending: [{ hash: 'h1' }], fresh: true });
    });
    
    it('handles relation does not exist error with cause (code 42P01)', async () => {
      vi.stubGlobal('window', { electronAPI: { getMigrations: vi.fn().mockResolvedValue([{ hash: 'h1' }]) } });
      const err = new Error('some error');
      (err as { cause: { code: string } }).cause = { code: '42P01' };
      
      vi.mocked(db.execute)
        .mockResolvedValueOnce(undefined as unknown) // SELECT 1
        .mockRejectedValueOnce(err); // SELECT hash

      const res = await checkMigrationStatus();
      expect(res).toEqual({ type: 'pending', pending: [{ hash: 'h1' }], fresh: true });
    });

    it('handles relation does not exist error string match', async () => {
      vi.stubGlobal('window', { electronAPI: { getMigrations: vi.fn().mockResolvedValue([]) } });
      const err = new Error('relation __drizzle_migrations does not exist');
      
      vi.mocked(db.execute)
        .mockResolvedValueOnce(undefined as unknown) // SELECT 1
        .mockRejectedValueOnce(err); // SELECT hash

      const res = await checkMigrationStatus();
      expect(res).toEqual({ type: 'synced' });
    });

    it('returns synced on 42P01 if no migrations', async () => {
      vi.stubGlobal('window', { electronAPI: { getMigrations: vi.fn().mockResolvedValue([]) } });
      
      vi.mocked(db.execute)
        .mockResolvedValueOnce(undefined as unknown) // SELECT 1
        .mockRejectedValueOnce({ code: '42P01' }); // SELECT hash

      const res = await checkMigrationStatus();
      expect(res).toEqual({ type: 'synced' });
    });

    it('handles other errors and returns corrupted', async () => {
      const err = new Error('some other error');
      vi.mocked(db.execute).mockRejectedValue(err);
      const res = await checkMigrationStatus();
      expect(res).toEqual({ type: 'corrupted', error: err });
    });

    it('throws unhandled errors in execute if code is not 42P01 and msg does not match', async () => {
      const err = new Error('unexpected parsing error');
      vi.stubGlobal('window', { electronAPI: { getMigrations: vi.fn().mockResolvedValue([]) } });
      vi.mocked(db.execute)
        .mockResolvedValueOnce(undefined as unknown) // SELECT 1
        .mockRejectedValueOnce(err); // SELECT hash

      const res = await checkMigrationStatus();
      expect(res).toEqual({ type: 'corrupted', error: err });
    });
    
    it('waits for client ready if not ready inside checkMigrationStatus', async () => {
      const getMigrations = vi.fn().mockResolvedValue([]);
      client.ready = false;
      const waitReadySpy = vi.fn().mockResolvedValue(undefined);
      client.waitReady = waitReadySpy();
      
      vi.stubGlobal('window', { electronAPI: { getMigrations } });
      vi.mocked(db.execute).mockRejectedValue(new Error('fail')); // fast exit
      await checkMigrationStatus();
      expect(waitReadySpy).toHaveBeenCalled();
    });
  });

  describe('resetDatabase', () => {
    it('resolves when deleteDatabase succeeds', async () => {
      const req: Partial<IDBOpenDBRequest> = {
        onsuccess: null,
        onerror: null,
        onblocked: null,
      };
      const deleteDatabase = vi.fn().mockReturnValue(req);
      vi.stubGlobal('indexedDB', { deleteDatabase });
      const promise = resetDatabase();
      if (req.onsuccess) req.onsuccess(new Event('success'));
      await expect(promise).resolves.toBeUndefined();
    });

    it('rejects when deleteDatabase fails', async () => {
      const req: Partial<IDBOpenDBRequest> = {
        error: new DOMException('delete fail'),
        onsuccess: null,
        onerror: null,
        onblocked: null,
      };
      const deleteDatabase = vi.fn().mockReturnValue(req);
      vi.stubGlobal('indexedDB', { deleteDatabase });
      const promise = resetDatabase();
      if (req.onerror) req.onerror(new Event('error'));
      await expect(promise).rejects.toThrow('delete fail');
    });

    it('handles onblocked', async () => {
      const req: Partial<IDBOpenDBRequest> = {
        onsuccess: null,
        onerror: null,
        onblocked: null,
      };
      const deleteDatabase = vi.fn().mockReturnValue(req);
      vi.stubGlobal('indexedDB', { deleteDatabase });
      const warnSpy = vi.spyOn(console, 'warn');
      resetDatabase();
      if (req.onblocked) req.onblocked(new Event('blocked'));
      expect(warnSpy).toHaveBeenCalledWith('Delete blocked');
    });
  });
});
