ALTER TABLE "Scene" ALTER COLUMN "id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "Scene" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Stream" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "Stream" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();