import { EventEmitter } from 'events';
import { configResource } from '../db/resources';

type JSONObject = { [k: string]: unknown };

function deepMerge(a: unknown, b: unknown): unknown {
  if (Array.isArray(a) && Array.isArray(b)) return b;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out: Record<string, unknown> = { ...(a as Record<string, unknown>) };
    for (const k of Object.keys(b as Record<string, unknown>)) {
      out[k] = deepMerge((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]);
    }
    return out;
  }
  return b === undefined ? a : b;
}

export default class ConfigManager extends EventEmitter {
  private defaults: JSONObject;
  private userSettings: JSONObject = {};
  private rowId: number | null = null;
  private writing = false;
  private writeQueue: Array<() => Promise<void>> = [];

  constructor(defaults: JSONObject = {}) {
    super();
    this.defaults = defaults;
    // initialize from DB
    this.init().catch((err) => {
      this.emit('error', err);
    });
  }

  private async init() {
    try {
      const cfg = await configResource.getAll();
      this.userSettings = cfg || {};
      this.emit('loaded');
    } catch (err) {
      this.emit('error', err);
    }
  }

  public get(key?: string) {
    if (!key) return deepMerge(this.defaults, this.userSettings);
    const parts = key.split('.');
    let curUser: unknown = this.userSettings;
    for (const p of parts) {
      if (curUser && typeof curUser === 'object' && Object.prototype.hasOwnProperty.call(curUser, p)) curUser = (curUser as Record<string, unknown>)[p];
      else { curUser = undefined; break; }
    }
    if (curUser !== undefined) return curUser;
    let curDef: unknown = this.defaults;
    for (const p of parts) {
      if (curDef && typeof curDef === 'object' && Object.prototype.hasOwnProperty.call(curDef, p)) curDef = (curDef as Record<string, unknown>)[p];
      else { curDef = undefined; break; }
    }
    return curDef;
  }

  public async set(key: string, value: unknown) {
    const task = async () => {
      const parts = key.split('.');
      let o: Record<string, unknown> = this.userSettings || {};
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!o[p] || typeof o[p] !== 'object') o[p] = {};
        o = o[p] as Record<string, unknown>;
      }
      o[parts[parts.length - 1]] = value;

      try {
        await configResource.setAll(this.userSettings);
        this.emit('changed', key, value);
      } catch (err: unknown) {
        this.emit('error', err);
        throw err;
      }
    };

    return new Promise<void>((resolve, reject) => {
      this.writeQueue.push(async () => {
        try { await task(); resolve(); } catch (e) { reject(e); }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.writing) return;
    this.writing = true;
    while (this.writeQueue.length) {
      const job = this.writeQueue.shift()!;
      try { await job(); } catch { /* swallow */ }
    }
    this.writing = false;
  }

  public close() {
    // no-op for DB-backed manager
  }
}
