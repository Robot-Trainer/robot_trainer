DROP TABLE "cameras" CASCADE;--> statement-breakpoint
DROP TABLE "scene_cameras" CASCADE;--> statement-breakpoint
ALTER TABLE "scenes" ADD COLUMN "data" json DEFAULT '{}'::json;--> statement-breakpoint
DROP TYPE "public"."cameraModality";