ALTER TABLE "asset_images" ADD COLUMN "generation_provider" varchar(40);--> statement-breakpoint
ALTER TABLE "asset_images" ADD COLUMN "generation_model" varchar(120);--> statement-breakpoint
ALTER TABLE "asset_images" ADD COLUMN "generation_prompt_version" varchar(80);