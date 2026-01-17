CREATE TABLE "robot_models" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "robot_models_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar NOT NULL,
	"dir_name" varchar NOT NULL,
	"class_name" varchar NOT NULL,
	"config_class_name" varchar NOT NULL,
	"properties" json DEFAULT '{}'::json
);
--> statement-breakpoint
CREATE TABLE "teleoperator_models" (
	"id" varchar PRIMARY KEY NOT NULL,
	"class_name" varchar NOT NULL,
	"config_class_name" varchar NOT NULL,
	"data" json DEFAULT '{}'::json
);
--> statement-breakpoint
ALTER TABLE "cameras" ALTER COLUMN "id" SET DATA TYPE integer USING "id"::integer;--> statement-breakpoint
ALTER TABLE "cameras" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "cameras_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "robots" ALTER COLUMN "id" SET DATA TYPE integer USING "id"::integer;--> statement-breakpoint
ALTER TABLE "robots" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "robots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);