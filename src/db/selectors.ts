import { eq } from 'drizzle-orm';
import { db } from './db';
import {
  scenesTable,
  sceneRobotsTable,
  sceneCamerasTable,
  sceneTeleoperatorsTable,
  robotsTable,
  robotModelsTable,
  camerasTable,
  teleoperatorModelsTable
} from './schema';

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

  const cameras = await db
    .select({
      camera: camerasTable,
      snapshot: sceneCamerasTable.snapshot
    })
    .from(sceneCamerasTable)
    .innerJoin(camerasTable, eq(sceneCamerasTable.cameraId, camerasTable.id))
    .where(eq(sceneCamerasTable.sceneId, sceneId));

  const teleoperators = await db
    .select({
      teleoperator: teleoperatorModelsTable,
      snapshot: sceneTeleoperatorsTable.snapshot
    })
    .from(sceneTeleoperatorsTable)
    .innerJoin(teleoperatorModelsTable, eq(sceneTeleoperatorsTable.teleoperatorId, teleoperatorModelsTable.id))
    .where(eq(sceneTeleoperatorsTable.sceneId, sceneId));

  // The snapshot structure:
  // Internal Format:
  // {
  //    ...config,
  //    robots: [ { ...robot, _snapshot: ... } ],
  //    cameras: [ { ...camera, _snapshot: ... } ],
  //    teleoperators: [ { ...teleop, _snapshot: ... } ]
  // }

  return {
    ...config,
    robots: robots.map(r => ({ ...r.robot, model: r.model, _snapshot: r.snapshot })),
    cameras: cameras.map(c => ({ ...c.camera, _snapshot: c.snapshot })),
    teleoperators: teleoperators.map(t => ({ ...t.teleoperator, _snapshot: t.snapshot }))
  };
};
