ALTER TABLE "ai_generations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD COLUMN "apply_metadata" jsonb;