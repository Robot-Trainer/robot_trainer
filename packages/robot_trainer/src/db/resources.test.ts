import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from './db';
import { configResource, scenesResource, robotModelsResource, teleoperatorModelsResource, robotsResource } from './resources';

vi.mock('./db', () => ({
  db: {}
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: vi.fn((_strings, ..._args) => ({ mapWith: vi.fn().mockReturnValue('mapWithResult') }))
}));

vi.mock('./schema', () => ({
  userConfigTable: { id: 'id' },
  robotModelsTable: {},
  teleoperatorModelsTable: {},
  robotsTable: { name: 'name', modality: 'modality', id: 'id' },
  scenesTable: { id: 'id', name: 'name', notes: 'notes', sceneXmlPath: 'sceneXmlPath', createdAt: 'createdAt', data: 'data' },
  sceneRobotsTable: { sceneId: 'sceneId', robotId: 'robotId' }
}));

vi.mock('./tableResource', () => ({
  tableResource: vi.fn().mockReturnValue({ testResource: true })
}));

describe('resources.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exports', () => {
    it('exports resources mapped by tableResource', () => {
      expect(robotModelsResource).toEqual({ testResource: true });
      expect(teleoperatorModelsResource).toEqual({ testResource: true });
      expect(robotsResource).toEqual({ testResource: true });
    });
  });

  describe('scenesResource', () => {
    it('list returns joined scenes', async () => {
      const executeMock = vi.fn().mockResolvedValue(['scene1', 'scene2']);
      const leftJoinMock2 = vi.fn().mockReturnValue({ execute: executeMock });
      const leftJoinMock1 = vi.fn().mockReturnValue({ leftJoin: leftJoinMock2 });
      const fromMock = vi.fn().mockReturnValue({ leftJoin: leftJoinMock1 });
      const selectMock = vi.fn().mockReturnValue({ from: fromMock });
      db.select = selectMock;

      const res = await scenesResource.list();

      expect(selectMock).toHaveBeenCalled();
      expect(fromMock).toHaveBeenCalled();
      expect(leftJoinMock1).toHaveBeenCalled();
      expect(leftJoinMock2).toHaveBeenCalled();
      expect(executeMock).toHaveBeenCalled();
      expect(res).toEqual(['scene1', 'scene2']);
    });
  });

  describe('configResource', () => {
    describe('getAll', () => {
      it('returns empty object if no rows', async () => {
        const limitMock = vi.fn().mockResolvedValue([]);
        const fromMock = vi.fn().mockReturnValue({ limit: limitMock });
        db.select = vi.fn().mockReturnValue({ from: fromMock });
        
        const res = await configResource.getAll();
        expect(res).toEqual({});
      });

      it('returns empty object if config is not a json object (e.g. array)', async () => {
        const limitMock = vi.fn().mockResolvedValue([{ config: [1, 2] }]);
        db.select = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ limit: limitMock }) });
        
        const res = await configResource.getAll();
        expect(res).toEqual({});
      });

      it('returns empty object if config is not a json object (null)', async () => {
        const limitMock = vi.fn().mockResolvedValue([{ config: null }]);
        db.select = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ limit: limitMock }) });
        
        const res = await configResource.getAll();
        expect(res).toEqual({});
      });
      
      it('returns config if it is a valid json object', async () => {
        const configData = { foo: 'bar' };
        const limitMock = vi.fn().mockResolvedValue([{ config: configData }]);
        db.select = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ limit: limitMock }) });
        
        const res = await configResource.getAll();
        expect(res).toEqual(configData);
      });
    });

    describe('setAll', () => {
      it('inserts new config if no existing row', async () => {
        const limitMock = vi.fn().mockResolvedValue([]);
        db.select = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ limit: limitMock }) });
        
        const valuesMock = vi.fn().mockResolvedValue(undefined);
        db.insert = vi.fn().mockReturnValue({ values: valuesMock });

        const res = await configResource.setAll({ foo: 'bar' });
        expect(db.insert).toHaveBeenCalled();
        expect(valuesMock).toHaveBeenCalledWith({ config: { foo: 'bar' } });
        expect(res).toEqual({ ok: true });
      });

      it('updates existing config if row exists', async () => {
        const limitMock = vi.fn().mockResolvedValue([{ id: 123 }]);
        db.select = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ limit: limitMock }) });
        
        const whereMock = vi.fn().mockResolvedValue(undefined);
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        db.update = vi.fn().mockReturnValue({ set: setMock });

        const res = await configResource.setAll({ hello: 'world' });
        expect(db.update).toHaveBeenCalled();
        expect(setMock).toHaveBeenCalledWith({ config: { hello: 'world' } });
        expect(whereMock).toHaveBeenCalled();
        expect(res).toEqual({ ok: true });
      });
    });

    describe('getKey', () => {
      it('returns full config if key is empty', async () => {
        vi.spyOn(configResource, 'getAll').mockResolvedValue({ a: 1 });
        const res = await configResource.getKey('');
        expect(res).toEqual({ a: 1 });
      });

      it('returns value from nested objects', async () => {
        vi.spyOn(configResource, 'getAll').mockResolvedValue({ a: { b: { c: 42 } } });
        const res = await configResource.getKey('a.b.c');
        expect(res).toEqual(42);
      });

      it('returns undefined if path breaks on non-object', async () => {
        vi.spyOn(configResource, 'getAll').mockResolvedValue({ a: 1 });
        const res = await configResource.getKey('a.b');
        expect(res).toBeUndefined();
      });

      it('returns undefined if parameter is missing', async () => {
        vi.spyOn(configResource, 'getAll').mockResolvedValue({ a: { c: 2 } });
        const res = await configResource.getKey('a.b');
        expect(res).toBeUndefined();
      });
      
      it('handles null within traversal', async () => {
        vi.spyOn(configResource, 'getAll').mockResolvedValue({ a: { b: null } });
        const res = await configResource.getKey('a.b.c');
        expect(res).toBeUndefined();
      });
    });

    describe('setKey', () => {
      beforeEach(() => {
        vi.spyOn(configResource, 'setAll').mockResolvedValue({ ok: true });
      });

      it('sets entire config if key is empty and value is object', async () => {
        vi.spyOn(configResource, 'getAll').mockResolvedValue({ a: 1 });
        const res = await configResource.setKey('', { b: 2 });
        expect(configResource.setAll).toHaveBeenCalledWith({ b: 2 });
        expect(res).toEqual({ ok: true });
      });

      it('sets entire config to empty object if key empty and value array', async () => {
        vi.spyOn(configResource, 'getAll').mockResolvedValue({ a: 1 });
        const res = await configResource.setKey('', [1, 2] as unknown);
        expect(configResource.setAll).toHaveBeenCalledWith({});
        expect(res).toEqual({ ok: true });
      });

      it('sets scalar top-level key', async () => {
        vi.spyOn(configResource, 'getAll').mockResolvedValue({ a: 1 });
        await configResource.setKey('b', 2);
        expect(configResource.setAll).toHaveBeenCalledWith({ a: 1, b: 2 });
      });

      it('sets nested key, creating objects for missing path parts', async () => {
        vi.spyOn(configResource, 'getAll').mockResolvedValue({ a: 1 });
        await configResource.setKey('x.y.z', 42);
        expect(configResource.setAll).toHaveBeenCalledWith({ a: 1, x: { y: { z: 42 } } });
      });

      it('overrides non-object with object if path expects object', async () => {
        vi.spyOn(configResource, 'getAll').mockResolvedValue({ x: { y: 1 } });
        await configResource.setKey('x.y.z', 42);
        expect(configResource.setAll).toHaveBeenCalledWith({ x: { y: { z: 42 } } });
      });
      
      it('creates object if traversing null', async () => {
        vi.spyOn(configResource, 'getAll').mockResolvedValue({ x: null as unknown });
        await configResource.setKey('x.y.z', 42);
        expect(configResource.setAll).toHaveBeenCalledWith({ x: { y: { z: 42 } } });
      });
    });
  });
});
