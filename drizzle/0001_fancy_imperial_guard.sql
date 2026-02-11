ALTER TABLE "sessions" ADD COLUMN "dataset_config" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "robot_config_snapshot" jsonb DEFAULT '{}'::jsonb;