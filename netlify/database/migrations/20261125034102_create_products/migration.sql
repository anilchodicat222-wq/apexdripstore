CREATE TABLE "products" (
	"id" text PRIMARY KEY,
	"position" integer DEFAULT 0 NOT NULL,
	"data" jsonb NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
