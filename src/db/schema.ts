import { integer, pgTable, varchar, uuid, json, text } from "drizzle-orm/pg-core";

export const userConfigTable = pgTable("user_config", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid('user_id'),
  config: json().default({})
});

export const robotsTable = pgTable("robots", {
  id: varchar('id').primaryKey(),
  serialNumber: varchar('serial_number').default(''),
  name: varchar('name').default(''),
  model: varchar('model').default(''),
  notes: text('notes').default(''),
  data: json('data').default({})
});

export const camerasTable = pgTable("cameras", {
  id: varchar('id').primaryKey(),
  serialNumber: varchar('serial_number').default(''),
  name: varchar('name').default(''),
  resolution: varchar('resolution').default(''),
  fps: integer('fps').default(0),
  data: json('data').default({})
});