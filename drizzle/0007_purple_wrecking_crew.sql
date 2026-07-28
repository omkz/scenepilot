DROP INDEX "shots_scene_position_unique";--> statement-breakpoint
ALTER TABLE "ai_generations" ADD COLUMN "scene_id" uuid;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_generations_scene_id_idx" ON "ai_generations" USING btree ("scene_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shots_scene_active_position_unique" ON "shots" USING btree ("scene_id","position") WHERE "shots"."archived_at" is null;