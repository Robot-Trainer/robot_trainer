import { integer, pgTable, varchar, uuid, json, text, timestamp, primaryKey, jsonb } from "drizzle-orm/pg-core";

export const userConfigTable = pgTable("user_config", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid('user_id'),
  config: json().default({})
});

export const robotsTable = pgTable("robots", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  serialNumber: varchar('serial_number').default(''),
  name: varchar('name').default(''),
  model: varchar('model').default(''),
  notes: text('notes').default(''),
  data: json('data').default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const teleoperatorsTable = pgTable("teleoperators", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  serialNumber: varchar("serial_number").default(""),
  name: varchar("name").default(""),
  model: varchar("model").default(""),
  notes: text("notes").default(""),
  data: json("data").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});


export const robotConfigurationsTable = pgTable("robot_configurations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});


export const camerasTable = pgTable("cameras", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  serialNumber: varchar('serial_number').default(''),
  name: varchar('name').default(''),
  resolution: varchar('resolution').default(''),
  fps: integer('fps').default(0),
  data: json('data').default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const robotModelsTable = pgTable("robot_models", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name').notNull(),
  dirName: varchar('dir_name').notNull(),
  className: varchar('class_name').notNull(),
  configClassName: varchar('config_class_name').notNull(),
  properties: json('properties').default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const teleoperatorModelsTable = pgTable("teleoperator_models", {
  id: varchar('id').primaryKey(),
  className: varchar('class_name').notNull(),
  configClassName: varchar('config_class_name').notNull(),
  data: json('data').default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const configRobotsTable = pgTable("config_robots", {
  configurationId: integer("configuration_id").references(() => robotConfigurationsTable.id).notNull(),
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
  teleoperatorId: varchar("teleoperator_id").references(() => teleoperatorModelsTable.id, { onDelete: "set null" }).notNull(),
  snapshot: jsonb("snapshot").notNull(),
}, (t) => [
  primaryKey({ columns: [t.configurationId, t.teleoperatorId] }),
]);
