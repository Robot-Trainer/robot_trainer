import { integer, pgTable, varchar, uuid, json, text, timestamp, primaryKey, jsonb, pgEnum, real } from "drizzle-orm/pg-core";

export const robotModalityEnum = pgEnum("robotModality", ["real", "simulated"]);
export const cameraModalityEnum = pgEnum("cameraModality", ["real", "simulated"]);

export const userConfigTable = pgTable("user_config", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  userId: uuid('user_id'),
  config: json().default({})
});

export const robotModelsTable = pgTable("robot_models", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name').notNull(),
  dirName: varchar('dir_name').notNull(),
  className: varchar('class_name').notNull(),
  configClassName: varchar('config_class_name').notNull(),
  properties: json('properties').default({}),
  modelXml: text('model_xml'),
  modelPath: varchar('model_path'),
  modelFormat: varchar('model_format'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const robotsTable = pgTable("robots", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  serialNumber: varchar('serial_number').default(''),
  name: varchar('name').default(''),
  notes: text('notes').default(''),
  data: json('data').default({}),
  robotModelId: integer('robot_model_id').references(() => robotModelsTable.id, { onDelete: 'set null' }),
  modality: robotModalityEnum('modality').default('real'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const teleoperatorsTable = pgTable("teleoperators", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  serialNumber: varchar("serial_number").default(""),
  name: varchar("name").default(""),
  model: varchar("model").default(""),
  notes: text("notes").default(""),
  data: json("data").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});


export const scenesTable = pgTable("scenes", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name").notNull(),
  sceneXmlPath: varchar('scene_xml_path'),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});


export const camerasTable = pgTable("cameras", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  serialNumber: varchar('serial_number').default(''),
  name: varchar('name').default(''),
  resolution: varchar('resolution').default(''),
  fps: integer('fps').default(0),
  positionX: real('position_x').default(0),
  positionY: real('position_y').default(0),
  positionZ: real('position_z').default(0),
  rotationX: real('rotation_x').default(0),
  rotationY: real('rotation_y').default(0),
  rotationZ: real('rotation_z').default(0),
  data: json('data').default({}),
  modality: cameraModalityEnum('modality').default('real'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});


export const teleoperatorModelsTable = pgTable("teleoperator_models", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  className: varchar("class_name").notNull(),
  configClassName: varchar("config_class_name").notNull(),
  data: json("data").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sceneRobotsTable = pgTable("scene_robots", {
  sceneId: integer("scene_id").references(() => scenesTable.id, { onDelete: "cascade" }).notNull(),
  robotId: integer("robot_id").references(() => robotsTable.id, { onDelete: "cascade" }).notNull(),
  snapshot: jsonb("snapshot").notNull(),
}, (t) => [
  primaryKey({ columns: [t.sceneId, t.robotId] }),
]);

export const sceneCamerasTable = pgTable("scene_cameras", {
  sceneId: integer("scene_id").references(() => scenesTable.id, { onDelete: "cascade" }).notNull(),
  cameraId: integer("camera_id").references(() => camerasTable.id, { onDelete: "cascade" }).notNull(),
  snapshot: jsonb("snapshot").notNull(),
}, (t) => [
  primaryKey({ columns: [t.sceneId, t.cameraId] }),
]);

export const sceneTeleoperatorsTable = pgTable("scene_teleoperators", {
  sceneId: integer("scene_id").references(() => scenesTable.id, { onDelete: "cascade" }).notNull(),
  teleoperatorId: integer("teleoperator_id").references(() => teleoperatorModelsTable.id, { onDelete: "cascade" }).notNull(),
  snapshot: jsonb("snapshot").notNull(),
}, (t) => [
  primaryKey({ columns: [t.sceneId, t.teleoperatorId] }),
]);

export const skillsTable = pgTable("skills", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const sessionsTable = pgTable("sessions", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name").notNull(),
  skillId: integer("skill_id").references(() => skillsTable.id, { onDelete: "set null" }),
  sceneId: integer("scene_id").references(() => scenesTable.id, { onDelete: "cascade" }).notNull(),
  datasetConfig: jsonb("dataset_config").default({}),
  sceneSnapshot: jsonb("scene_snapshot").default({}),
  initialSceneState: jsonb("initial_scene_state"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const episodesTable = pgTable("episodes", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name").notNull(),
  sessionId: integer("session_id").references(() => sessionsTable.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

