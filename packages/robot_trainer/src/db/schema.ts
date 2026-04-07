import { integer, pgTable, varchar, uuid, json, text, timestamp, primaryKey, jsonb, pgEnum, boolean } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";
import * as v from "valibot";
import type { InferInput } from "valibot";
export const robotModalityEnum = pgEnum("robotModality", ["real", "simulated"]);

export const userConfigTable = pgTable("user_config", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  userId: uuid('user_id'),
  config: json().default({})
});

// --- Valibot schemas for sim/real properties ---

export const RobotModelSimPropertiesSchema = v.object({
  xml_string: v.optional(v.string()),
  modelPath: v.optional(v.string()),
  modelFormat: v.optional(v.string()),
  numJoints: v.optional(v.number()),
  jointNames: v.optional(v.array(v.string())),
  actuatorNames: v.optional(v.array(v.string())),
  siteNames: v.optional(v.array(v.string())),
  hasGripper: v.optional(v.boolean()),
});
export type RobotModelSimProperties = InferInput<typeof RobotModelSimPropertiesSchema>;

export const RobotModelRealPropertiesSchema = v.object({});
export type RobotModelRealProperties = InferInput<typeof RobotModelRealPropertiesSchema>;

export const RobotSimPropertiesSchema = v.object({
  xml_string: v.optional(v.string()),
  modelPath: v.optional(v.string()),
  modelFormat: v.optional(v.string()),
  sourceDir: v.optional(v.string()),
});
export type RobotSimProperties = InferInput<typeof RobotSimPropertiesSchema>;

export const CalibrationResultsSchema = v.record(v.string(), v.object({
  id: v.number(),
  drive_mode: v.optional(v.number()),
  homing_offset: v.number(),
  range_min: v.number(),
  range_max: v.number(),
}));

export const CameraEntrySchema = v.object({
  name: v.optional(v.string()),
  deviceId: v.optional(v.string()),
  deviceLabel: v.optional(v.string()),
  stream: v.optional(v.any()),
  serialNumber: v.optional(v.string()),
});

export type CameraEntry = InferInput<typeof CameraEntrySchema>;

export const RobotRealPropertiesSchema = v.object({
  config: v.optional(
    v.object({
      calibration_dir: v.optional(v.string()),
      port: v.optional(v.string()),
      disable_torque_on_disconnect: v.optional(v.boolean()),
      use_degrees: v.optional(v.boolean()),
      max_relative_target: v.optional(v.nullable(v.number())),
    })
  ),
  cameras: v.optional(v.array(CameraEntrySchema)),
  calibration: v.optional(CalibrationResultsSchema),
});
export type RobotRealProperties = InferInput<typeof RobotRealPropertiesSchema>;

export const robotModelsTable = pgTable("robot_models", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar("name").notNull(),
  dirName: varchar("dir_name").notNull(),
  simProperties: json("sim_properties").$type<RobotModelSimProperties>().default({}),
  realProperties: json("real_properties").$type<RobotModelRealProperties>().default({}),
  modelXml: text("model_xml"),
  modelPath: varchar("model_path"),
  modelFormat: varchar("model_format"),
  supportedModalities: robotModalityEnum("supported_modalities")
    .array()
    .default(["simulated"]),
  teleoperator: boolean("teleoperator").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const usbVendorsTable = pgTable("usb_vendors", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  company: varchar("company").notNull(),
  vendorId: integer("vendor_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const RobotDataColumnSchema = v.object({
  config: v.optional(
    v.object({
      id: v.optional(v.string()),
      calibration_dir: v.optional(v.string()),
      port: v.optional(v.string()),
      disable_torque_on_disconnect: v.optional(v.boolean()),
      use_degrees: v.optional(v.boolean()),
      max_relative_target: v.optional(v.number()),
    })
  ),
  modelXml: v.optional(v.string()),
  cameras: v.optional(v.array(CameraEntrySchema)),
  calibration: v.optional(CalibrationResultsSchema),
});

export type RobotDataColumn = InferInput<typeof RobotDataColumnSchema>;

export const robotsTable = pgTable("robots", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  serialNumber: varchar("serial_number").default(""),
  name: varchar("name").default(""),
  data: json("data").$type<RobotDataColumn>().default({}),
  simProperties: json("sim_properties").$type<RobotSimProperties>().default({}),
  realProperties: json("real_properties").$type<RobotRealProperties>().default({}),
  robotModelId: integer("robot_model_id").references(
    () => robotModelsTable.id,
    { onDelete: "set null" },
  ),
  modality: robotModalityEnum("modality").default("real"),
  teleoperator: boolean("teleoperator").default(false),
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


export const sceneRobotsTable = pgTable("scene_robots", {
  sceneId: integer("scene_id").references(() => scenesTable.id, { onDelete: "cascade" }).notNull(),
  robotId: integer("robot_id").references(() => robotsTable.id, { onDelete: "cascade" }).notNull(),
  snapshot: jsonb("snapshot").notNull(),
}, (t) => [
  primaryKey({ columns: [t.sceneId, t.robotId] }),
]);

export const sceneTeleoperatorsTable = pgTable("scene_teleoperators", {
  sceneId: integer("scene_id").references(() => scenesTable.id, { onDelete: "cascade" }).notNull(),
  teleoperatorId: integer("teleoperator_id").references(() => robotModelsTable.id, { onDelete: "cascade" }).notNull(),
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

// Inferred record types for each table
export type DatasetRecord = InferSelectModel<typeof datasetsTable>;
export type EpisodeRecord = InferSelectModel<typeof episodesTable>;
export type RobotModelRecord = InferSelectModel<typeof robotModelsTable>;
export type RobotRecord = InferSelectModel<typeof robotsTable>;
export type SceneRecord = InferSelectModel<typeof scenesTable>;
export type SceneRobotRecord = InferSelectModel<typeof sceneRobotsTable>;
export type SceneTeleoperatorRecord = InferSelectModel<typeof sceneTeleoperatorsTable>;
export type SkillRecord = InferSelectModel<typeof skillsTable>;

export type UsbVendorRecord = InferSelectModel<typeof usbVendorsTable>;
export type UserConfigRecord = InferSelectModel<typeof userConfigTable>;
