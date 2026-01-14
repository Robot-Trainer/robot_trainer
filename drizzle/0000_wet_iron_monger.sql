CREATE TABLE "cameras" (
	"id" varchar PRIMARY KEY NOT NULL,
	"serial_number" varchar DEFAULT '',
	"name" varchar DEFAULT '',
	"resolution" varchar DEFAULT '',
	"fps" integer DEFAULT 0,
	"data" json DEFAULT '{}'::json
);
--> statement-breakpoint
CREATE TABLE "robots" (
	"id" varchar PRIMARY KEY NOT NULL,
	"serial_number" varchar DEFAULT '',
	"name" varchar DEFAULT '',
	"model" varchar DEFAULT '',
	"notes" text DEFAULT '',
	"data" json DEFAULT '{}'::json
);
--> statement-breakpoint
CREATE TABLE "user_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid,
	"config" json DEFAULT '{}'::json
);
