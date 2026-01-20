import { integer, pgTable, varchar, uuid, json, text, timestamp, primaryKey, jsonb, pgEnum, real } from "drizzle-orm/pg-core";

export const robotModalityEnum = pgEnum("robotModality", ["real", "simulated"]);
export const cameraModalityEnum = pgEnum("cameraModality", ["real", "simulated"]);

export const userConfigTable = pgTable("user_config", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  userId: uuid('user_id'),
  config: json().default({})
});

export const robotsTable = pgTable("robots", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  serialNumber: varchar('serial_number').default(''),
  name: varchar('name').default(''),
  model: varchar('model').default(''),
  notes: text('notes').default(''),
  data: json('data').default({}),
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


export const robotConfigurationsTable = pgTable("robot_configurations", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name").notNull(),
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

export const robotModelsTable = pgTable("robot_models", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name').notNull(),
  dirName: varchar('dir_name').notNull(),
  className: varchar('class_name').notNull(),
  configClassName: varchar('config_class_name').notNull(),
  properties: json('properties').default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const teleoperatorModelsTable = pgTable("teleoperator_models", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  className: varchar("class_name").notNull(),
  configClassName: varchar("config_class_name").notNull(),
  data: json("data").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const configRobotsTable = pgTable("config_robots", {
  configurationId: integer("configuration_id").references(() => robotConfigurationsTable.id).notNull(),
  name: varchar("name").notNull(),
  robotId: integer("robot_id").references(() => robotsTable.id, { onDelete: "set null" }).notNull(),
  snapshot: jsonb("snapshot").notNull(),
}, (t) => [
  primaryKey({ columns: [t.configurationId, t.robotId] }),
]);

export const configCamerasTable = pgTable("config_cameras", {
  configurationId: integer("configuration_id").references(() => robotConfigurationsTable.id).notNull(),
  cameraId: integer("camera_id").references(() => camerasTable.id, { onDelete: "set null" }).notNull(),
  snapshot: jsonb("snapshot").notNull(),
}, (t) => [
  primaryKey({ columns: [t.configurationId, t.cameraId] }),
]);

export const configTeleoperatorsTable = pgTable("config_teleoperators", {
  configurationId: integer("configuration_id").references(() => robotConfigurationsTable.id).notNull(),
  teleoperatorId: integer("teleoperator_id").references(() => teleoperatorModelsTable.id, { onDelete: "set null" }).notNull(),
  snapshot: jsonb("snapshot").notNull(),
}, (t) => [
  primaryKey({ columns: [t.configurationId, t.teleoperatorId] }),
]);
