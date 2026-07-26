CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"description" text,
	"genre" varchar(40) NOT NULL,
	"primary_language" varchar(40) NOT NULL,
	"episode_count" integer NOT NULL,
	"episode_duration" varchar(30) NOT NULL,
	"orientation" varchar(30) NOT NULL,
	"status" varchar(20) NOT NULL,
	"current_season" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_unique" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_archived_at_idx" ON "projects" USING btree ("archived_at");