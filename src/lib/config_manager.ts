import { EventEmitter } from 'events';
import { configResource } from '../db/resources';

type JSONObject = { [k: string]: any };

function deepMerge(a: any, b: any): any {
  if (Array.isArray(a) && Array.isArray(b)) return b;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out: any = { ...a };
    for (const k of Object.keys(b)) {
      out[k] = deepMerge(a[k], b[k]);
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
    let curUser: any = this.userSettings;
    for (const p of parts) {
      if (curUser && Object.prototype.hasOwnProperty.call(curUser, p)) curUser = curUser[p];
      else { curUser = undefined; break; }
    }
    if (curUser !== undefined) return curUser;
    let curDef: any = this.defaults;
    for (const p of parts) {
      if (curDef && Object.prototype.hasOwnProperty.call(curDef, p)) curDef = curDef[p];
      else { curDef = undefined; break; }
    }
    return curDef;
  }

  public async set(key: string, value: any) {
    const task = async () => {
      const parts = key.split('.');
      let o: any = this.userSettings || {};
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!o[p] || typeof o[p] !== 'object') o[p] = {};
        o = o[p];
      }
      o[parts[parts.length - 1]] = value;

      try {
        await configResource.setAll(this.userSettings);
        this.emit('changed', key, value);
      } catch (err: any) {
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
      try { await job(); } catch (e) { /* swallow */ }
    }
    this.writing = false;
  }

  public close() {
    // no-op for DB-backed manager
  }
}
