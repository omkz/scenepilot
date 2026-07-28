CREATE TABLE "asset_storage_deletion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_provider" varchar(40) NOT NULL,
	"storage_key" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_code" varchar(80),
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "asset_storage_deletion_jobs_pending_idx" ON "asset_storage_deletion_jobs" USING btree ("completed_at","next_attempt_at");--> statement-breakpoint
CREATE INDEX "asset_storage_deletion_jobs_provider_idx" ON "asset_storage_deletion_jobs" USING btree ("storage_provider");--> statement-breakpoint
CREATE INDEX "asset_storage_deletion_jobs_created_at_idx" ON "asset_storage_deletion_jobs" USING btree ("created_at");--> statement-breakpoint
UPDATE "asset_images"
SET "image_role" = 'Inspiration', "updated_at" = now()
WHERE "image_role" = 'Alternate View';
