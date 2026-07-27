CREATE TABLE "episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"episode_number" integer NOT NULL,
	"next_scene_number" integer DEFAULT 1 NOT NULL,
	"title" varchar(150) NOT NULL,
	"summary" text,
	"outline" text,
	"script" text,
	"cliffhanger" text,
	"target_duration_seconds" integer NOT NULL,
	"status" varchar(30) DEFAULT 'Draft' NOT NULL,
	"production_status" varchar(40) DEFAULT 'Not Started' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scene_characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"scene_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"costume_id" uuid,
	"role_in_scene" varchar(100),
	"emotional_state" varchar(500),
	"physical_state" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"scene_number" integer NOT NULL,
	"position" integer NOT NULL,
	"title" varchar(150) NOT NULL,
	"purpose" text,
	"summary" text,
	"script" text,
	"emotional_tone" varchar(200),
	"time_of_day" varchar(30) DEFAULT 'Unspecified' NOT NULL,
	"target_duration_seconds" integer NOT NULL,
	"location_id" uuid,
	"status" varchar(30) DEFAULT 'Draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "next_episode_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_characters" ADD CONSTRAINT "scene_characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_characters" ADD CONSTRAINT "scene_characters_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_characters" ADD CONSTRAINT "scene_characters_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_characters" ADD CONSTRAINT "scene_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_characters" ADD CONSTRAINT "scene_characters_costume_id_costumes_id_fk" FOREIGN KEY ("costume_id") REFERENCES "public"."costumes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_project_number_unique" ON "episodes" USING btree ("project_id","episode_number");--> statement-breakpoint
CREATE INDEX "episodes_project_id_idx" ON "episodes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "episodes_status_idx" ON "episodes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "episodes_production_status_idx" ON "episodes" USING btree ("production_status");--> statement-breakpoint
CREATE INDEX "episodes_archived_at_idx" ON "episodes" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "scene_characters_scene_character_unique" ON "scene_characters" USING btree ("scene_id","character_id");--> statement-breakpoint
CREATE INDEX "scene_characters_project_id_idx" ON "scene_characters" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "scene_characters_episode_id_idx" ON "scene_characters" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "scene_characters_scene_id_idx" ON "scene_characters" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scene_characters_character_id_idx" ON "scene_characters" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "scene_characters_costume_id_idx" ON "scene_characters" USING btree ("costume_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scenes_episode_number_unique" ON "scenes" USING btree ("episode_id","scene_number");--> statement-breakpoint
CREATE UNIQUE INDEX "scenes_episode_position_unique" ON "scenes" USING btree ("episode_id","position");--> statement-breakpoint
CREATE INDEX "scenes_project_id_idx" ON "scenes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "scenes_episode_id_idx" ON "scenes" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "scenes_location_id_idx" ON "scenes" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "scenes_position_idx" ON "scenes" USING btree ("position");--> statement-breakpoint
CREATE INDEX "scenes_archived_at_idx" ON "scenes" USING btree ("archived_at");