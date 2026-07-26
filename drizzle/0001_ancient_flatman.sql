CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"asset_code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"narrative_role" varchar(30) NOT NULL,
	"age" integer,
	"gender_presentation" varchar(100),
	"personality" text,
	"motivation" text,
	"appearance" text,
	"distinguishing_features" text,
	"approval_status" varchar(20) DEFAULT 'Draft' NOT NULL,
	"facial_identity_locked" boolean DEFAULT false NOT NULL,
	"skin_tone_locked" boolean DEFAULT false NOT NULL,
	"eye_color_locked" boolean DEFAULT false NOT NULL,
	"hairstyle_locked" boolean DEFAULT false NOT NULL,
	"body_proportions_locked" boolean DEFAULT false NOT NULL,
	"distinguishing_features_locked" boolean DEFAULT false NOT NULL,
	"accessories_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "costumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"asset_code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(30) DEFAULT 'Default' NOT NULL,
	"condition" varchar(30) DEFAULT 'Clean' NOT NULL,
	"approval_status" varchar(20) DEFAULT 'Draft' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"asset_code" varchar(20) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"location_type" varchar(30) NOT NULL,
	"architecture_style" varchar(500),
	"default_time_of_day" varchar(30) NOT NULL,
	"default_lighting" varchar(40) NOT NULL,
	"visual_identity_notes" text,
	"approval_status" varchar(20) DEFAULT 'Draft' NOT NULL,
	"architecture_locked" boolean DEFAULT false NOT NULL,
	"layout_locked" boolean DEFAULT false NOT NULL,
	"lighting_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "next_character_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "next_costume_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "next_location_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costumes" ADD CONSTRAINT "costumes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costumes" ADD CONSTRAINT "costumes_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "characters_project_asset_code_unique" ON "characters" USING btree ("project_id","asset_code");--> statement-breakpoint
CREATE INDEX "characters_project_id_idx" ON "characters" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "characters_approval_status_idx" ON "characters" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "characters_archived_at_idx" ON "characters" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "costumes_project_asset_code_unique" ON "costumes" USING btree ("project_id","asset_code");--> statement-breakpoint
CREATE UNIQUE INDEX "costumes_character_default_unique" ON "costumes" USING btree ("character_id") WHERE "costumes"."is_default" = true AND "costumes"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "costumes_project_id_idx" ON "costumes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "costumes_character_id_idx" ON "costumes" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "costumes_approval_status_idx" ON "costumes" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "costumes_archived_at_idx" ON "costumes" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_project_asset_code_unique" ON "locations" USING btree ("project_id","asset_code");--> statement-breakpoint
CREATE INDEX "locations_project_id_idx" ON "locations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "locations_approval_status_idx" ON "locations" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "locations_archived_at_idx" ON "locations" USING btree ("archived_at");