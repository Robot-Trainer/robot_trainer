import { eq } from 'drizzle-orm';
import { db } from './db';
import {
  scenesTable,
  sceneRobotsTable,
  sceneTeleoperatorsTable,
  robotsTable,
  robotModelsTable,
  teleoperatorModelsTable
} from './schema';
import { normalizeCameraList } from '../types/camera';

export const getSceneSnapshot = async (sceneId: number) => {
  const [config] = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.id, sceneId));

  if (!config) return null;

  const robots = await db
    .select({
      robot: robotsTable,
      model: robotModelsTable,
      snapshot: sceneRobotsTable.snapshot
    })
    .from(sceneRobotsTable)
    .innerJoin(robotsTable, eq(sceneRobotsTable.robotId, robotsTable.id))
    .leftJoin(robotModelsTable, eq(robotsTable.robotModelId, robotModelsTable.id))
    .where(eq(sceneRobotsTable.sceneId, sceneId));

  const teleoperators = await db
    .select({
      teleoperator: teleoperatorModelsTable,
      snapshot: sceneTeleoperatorsTable.snapshot
    })
    .from(sceneTeleoperatorsTable)
    .innerJoin(teleoperatorModelsTable, eq(sceneTeleoperatorsTable.teleoperatorId, teleoperatorModelsTable.id))
    .where(eq(sceneTeleoperatorsTable.sceneId, sceneId));

  const sceneData = config.data as Record<string, unknown> | undefined;
  const cameras = normalizeCameraList(sceneData?.cameras);

  return {
    ...config,
    robots: robots.map(r => ({ ...r.robot, model: r.model, _snapshot: r.snapshot })),
    cameras: cameras.map((camera) => ({ ...camera, _snapshot: camera })),
    teleoperators: teleoperators.map(t => ({ ...t.teleoperator, _snapshot: t.snapshot }))
  };
};
