import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import ConfigManager from './config_manager';
import { configResource } from '../db/resources';

describe('ConfigManager DB-backed behavior', () => {
  let store: any;

  beforeEach(() => {
    store = {};
    vi.spyOn(configResource, 'getAll' as any).mockImplementation(async () => store);
    vi.spyOn(configResource, 'setAll' as any).mockImplementation(async (cfg: any) => { store = cfg; return { ok: true }; });
    vi.restoreAllMocks();
    // re-apply spies after restore to ensure clean state
    vi.spyOn(configResource, 'getAll' as any).mockImplementation(async () => store);
    vi.spyOn(configResource, 'setAll' as any).mockImplementation(async (cfg: any) => { store = cfg; return { ok: true }; });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('persists set() into configResource', async () => {
    const cm = new ConfigManager({});
    await new Promise((r) => cm.on('loaded', r));
    await cm.set('foo.bar', 42);
    expect(store.foo.bar).toBe(42);
    cm.close();
  });

  it('emits changed events', async () => {
    const cm = new ConfigManager({});
    await new Promise((r) => cm.on('loaded', r));
    const events: any[] = [];
    cm.on('changed', (k, v) => events.push({ k, v }));
    await cm.set('x', 5);
    expect(events.some(e => e.k === 'x' && e.v === 5)).toBe(true);
    cm.close();
  });

  it('queues rapid set() calls safely', async () => {
    const cm = new ConfigManager({});
    await new Promise((r) => cm.on('loaded', r));
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) promises.push(cm.set('cnt', i));
    await Promise.all(promises);
    expect(typeof store.cnt).toBe('number');
    cm.close();
  });

  it('propagates write errors from underlying storage', async () => {
    const cm = new ConfigManager({});
    await new Promise((r) => cm.on('loaded', r));
    // make setAll throw once
    (configResource.setAll as any).mockImplementationOnce(() => Promise.reject(new Error('db failure')));
    await expect(cm.set('k', 'v')).rejects.toThrow('db failure');
    cm.close();
  });
});
