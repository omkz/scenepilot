CREATE TABLE "shot_characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"scene_id" uuid NOT NULL,
	"shot_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"costume_id" uuid,
	"screen_position" varchar(30),
	"pose" varchar(500),
	"expression" varchar(500),
	"action" text,
	"gaze_direction" varchar(300),
	"physical_state" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"scene_id" uuid NOT NULL,
	"shot_number" integer NOT NULL,
	"position" integer NOT NULL,
	"title" varchar(150) NOT NULL,
	"description" text,
	"shot_type" varchar(40) NOT NULL,
	"camera_angle" varchar(40) NOT NULL,
	"camera_movement" varchar(40) NOT NULL,
	"lens" varchar(30) NOT NULL,
	"composition" text,
	"action" text,
	"dialogue_excerpt" text,
	"emotional_intent" varchar(500),
	"target_duration_seconds" integer NOT NULL,
	"location_id" uuid,
	"time_of_day" varchar(30) DEFAULT 'Continuous' NOT NULL,
	"lighting_notes" text,
	"generation_prompt" text,
	"negative_prompt" text,
	"status" varchar(30) DEFAULT 'Draft' NOT NULL,
	"approval_status" varchar(20) DEFAULT 'Draft' NOT NULL,
	"composition_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "storyboard_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"scene_id" uuid NOT NULL,
	"shot_id" uuid NOT NULL,
	"job_type" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'Queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"input_snapshot" jsonb NOT NULL,
	"output_placeholder" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "episodes" ADD COLUMN "storyboard_status" varchar(30) DEFAULT 'Not Started' NOT NULL;--> statement-breakpoint
ALTER TABLE "episodes" ADD COLUMN "storyboard_approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "scenes" ADD COLUMN "next_shot_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "shot_characters" ADD CONSTRAINT "shot_characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_characters" ADD CONSTRAINT "shot_characters_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_characters" ADD CONSTRAINT "shot_characters_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_characters" ADD CONSTRAINT "shot_characters_shot_id_shots_id_fk" FOREIGN KEY ("shot_id") REFERENCES "public"."shots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_characters" ADD CONSTRAINT "shot_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shot_characters" ADD CONSTRAINT "shot_characters_costume_id_costumes_id_fk" FOREIGN KEY ("costume_id") REFERENCES "public"."costumes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_jobs" ADD CONSTRAINT "storyboard_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_jobs" ADD CONSTRAINT "storyboard_jobs_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_jobs" ADD CONSTRAINT "storyboard_jobs_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_jobs" ADD CONSTRAINT "storyboard_jobs_shot_id_shots_id_fk" FOREIGN KEY ("shot_id") REFERENCES "public"."shots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shot_characters_shot_character_unique" ON "shot_characters" USING btree ("shot_id","character_id");--> statement-breakpoint
CREATE INDEX "shot_characters_project_id_idx" ON "shot_characters" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "shot_characters_episode_id_idx" ON "shot_characters" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "shot_characters_scene_id_idx" ON "shot_characters" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "shot_characters_shot_id_idx" ON "shot_characters" USING btree ("shot_id");--> statement-breakpoint
CREATE INDEX "shot_characters_character_id_idx" ON "shot_characters" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "shot_characters_costume_id_idx" ON "shot_characters" USING btree ("costume_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shots_scene_number_unique" ON "shots" USING btree ("scene_id","shot_number");--> statement-breakpoint
CREATE UNIQUE INDEX "shots_scene_position_unique" ON "shots" USING btree ("scene_id","position");--> statement-breakpoint
CREATE INDEX "shots_project_id_idx" ON "shots" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "shots_episode_id_idx" ON "shots" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "shots_scene_id_idx" ON "shots" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "shots_location_id_idx" ON "shots" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "shots_approval_status_idx" ON "shots" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "shots_archived_at_idx" ON "shots" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "storyboard_jobs_project_id_idx" ON "storyboard_jobs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "storyboard_jobs_episode_id_idx" ON "storyboard_jobs" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "storyboard_jobs_scene_id_idx" ON "storyboard_jobs" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "storyboard_jobs_shot_id_idx" ON "storyboard_jobs" USING btree ("shot_id");--> statement-breakpoint
CREATE INDEX "storyboard_jobs_status_idx" ON "storyboard_jobs" USING btree ("status");