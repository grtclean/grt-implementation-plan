CREATE TYPE "public"."help_category" AS ENUM('GETTING_STARTED', 'FEATURE_GUIDE', 'FAQ', 'TROUBLESHOOTING', 'BEST_PRACTICE');--> statement-breakpoint
CREATE TABLE "help_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_path" varchar(200),
	"feature_key" varchar(100),
	"title" varchar(300) NOT NULL,
	"title_zh" varchar(300) NOT NULL,
	"content" text NOT NULL,
	"content_zh" text NOT NULL,
	"category" "help_category" NOT NULL,
	"tags" json,
	"related_routes" json,
	"video_url" varchar(500),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "help_articles" ADD CONSTRAINT "help_articles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "help_route_path_idx" ON "help_articles" USING btree ("route_path");--> statement-breakpoint
CREATE INDEX "help_feature_key_idx" ON "help_articles" USING btree ("feature_key");--> statement-breakpoint
CREATE INDEX "help_category_idx" ON "help_articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "help_active_idx" ON "help_articles" USING btree ("is_active");