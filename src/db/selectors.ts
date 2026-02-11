import { eq } from 'drizzle-orm';
import { db } from './db';
import {
  robotConfigurationsTable,
  configRobotsTable,
  configCamerasTable,
  configTeleoperatorsTable,
  robotsTable,
  camerasTable,
  teleoperatorModelsTable
} from './schema';

export const getRobotConfigurationSnapshot = async (configurationId: number) => {
  const [config] = await db
    .select()
    .from(robotConfigurationsTable)
    .where(eq(robotConfigurationsTable.id, configurationId));

  if (!config) return null;

  const robots = await db
    .select({
      robot: robotsTable,
      snapshot: configRobotsTable.snapshot
    })
    .from(configRobotsTable)
    .innerJoin(robotsTable, eq(configRobotsTable.robotId, robotsTable.id))
    .where(eq(configRobotsTable.configurationId, configurationId));

  const cameras = await db
    .select({
      camera: camerasTable,
      snapshot: configCamerasTable.snapshot
    })
    .from(configCamerasTable)
    .innerJoin(camerasTable, eq(configCamerasTable.cameraId, camerasTable.id))
    .where(eq(configCamerasTable.configurationId, configurationId));

  const teleoperators = await db
    .select({
      teleoperator: teleoperatorModelsTable,
      snapshot: configTeleoperatorsTable.snapshot
    })
    .from(configTeleoperatorsTable)
    .innerJoin(teleoperatorModelsTable, eq(configTeleoperatorsTable.teleoperatorId, teleoperatorModelsTable.id))
    .where(eq(configTeleoperatorsTable.configurationId, configurationId));

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
    robots: robots.map(r => ({ ...r.robot, _snapshot: r.snapshot })),
    cameras: cameras.map(c => ({ ...c.camera, _snapshot: c.snapshot })),
    teleoperators: teleoperators.map(t => ({ ...t.teleoperator, _snapshot: t.snapshot }))
  };
};
