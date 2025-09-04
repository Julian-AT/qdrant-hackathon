ALTER TABLE "Message_v2" ALTER COLUMN "sceneId" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "Message" ALTER COLUMN "sceneId" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "Scene" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "Scene" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "Stream" ALTER COLUMN "sceneId" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "Vote_v2" ALTER COLUMN "sceneId" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "Vote" ALTER COLUMN "sceneId" SET DATA TYPE uuid;