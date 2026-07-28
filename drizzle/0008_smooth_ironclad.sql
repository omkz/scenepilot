CREATE TABLE "asset_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"character_id" uuid,
	"costume_id" uuid,
	"location_id" uuid,
	"image_role" varchar(30) NOT NULL,
	"source_type" varchar(20) NOT NULL,
	"storage_provider" varchar(40) NOT NULL,
	"storage_key" text NOT NULL,
	"storage_url" text NOT NULL,
	"original_filename" text,
	"mime_type" varchar(40) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"source_url" text,
	"source_note" text,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_images_exactly_one_owner_check" CHECK (num_nonnulls("asset_images"."character_id", "asset_images"."costume_id", "asset_images"."location_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "visual_direction" text;--> statement-breakpoint
UPDATE "characters"
SET "visual_direction" = "appearance"
WHERE "visual_direction" IS NULL
	AND NULLIF(BTRIM("appearance"), '') IS NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_images" ADD CONSTRAINT "asset_images_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_images" ADD CONSTRAINT "asset_images_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_images" ADD CONSTRAINT "asset_images_costume_id_costumes_id_fk" FOREIGN KEY ("costume_id") REFERENCES "public"."costumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_images" ADD CONSTRAINT "asset_images_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_images_storage_key_unique" ON "asset_images" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_images_character_master_unique" ON "asset_images" USING btree ("character_id") WHERE "asset_images"."character_id" is not null AND "asset_images"."image_role" = 'Master Reference';--> statement-breakpoint
CREATE UNIQUE INDEX "asset_images_costume_master_unique" ON "asset_images" USING btree ("costume_id") WHERE "asset_images"."costume_id" is not null AND "asset_images"."image_role" = 'Master Reference';--> statement-breakpoint
CREATE UNIQUE INDEX "asset_images_location_master_unique" ON "asset_images" USING btree ("location_id") WHERE "asset_images"."location_id" is not null AND "asset_images"."image_role" = 'Master Reference';--> statement-breakpoint
CREATE INDEX "asset_images_project_id_idx" ON "asset_images" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "asset_images_character_id_idx" ON "asset_images" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "asset_images_costume_id_idx" ON "asset_images" USING btree ("costume_id");--> statement-breakpoint
CREATE INDEX "asset_images_location_id_idx" ON "asset_images" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "asset_images_image_role_idx" ON "asset_images" USING btree ("image_role");--> statement-breakpoint
CREATE INDEX "asset_images_created_at_idx" ON "asset_images" USING btree ("created_at");
