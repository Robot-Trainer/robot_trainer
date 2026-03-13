import { integer, pgTable, varchar, uuid, json, text, timestamp, primaryKey, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const robotModalityEnum = pgEnum("robotModality", ["real", "simulated"]);

export const userConfigTable = pgTable("user_config", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  userId: uuid('user_id'),
  config: json().default({})
});

export const robotModelsTable = pgTable("robot_models", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name').notNull(),
  dirName: varchar('dir_name').notNull(),
  className: varchar('class_name'),
  configClassName: varchar('config_class_name'),
  properties: json('properties').default({}),
  modelXml: text('model_xml'),
  modelPath: varchar('model_path'),
  modelFormat: varchar('model_format'),
  supportedModalities: robotModalityEnum('supported_modalities').array().default(['simulated']),
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
  data: json("data").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});


export const teleoperatorModelsTable = pgTable("teleoperator_models", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  className: varchar("class_name"),
  configClassName: varchar("config_class_name"),
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

export const datasetsTable = pgTable("datasets", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name").notNull(),
  skillId: integer("skill_id").references(() => skillsTable.id, { onDelete: "set null" }),
  sceneId: integer("scene_id").references(() => scenesTable.id, { onDelete: "cascade" }).notNull(),
  datasetDir: text("dataset_dir").default(""),
  datasetConfig: jsonb("dataset_config").default({}),
  sceneSnapshot: jsonb("scene_snapshot").default({}),
  initialSceneState: jsonb("initial_scene_state"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const episodesTable = pgTable("episodes", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name").notNull(),
  datasetId: integer("dataset_id").references(() => datasetsTable.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
