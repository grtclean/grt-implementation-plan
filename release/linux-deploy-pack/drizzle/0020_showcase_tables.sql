-- Targeted Showcase Schema: showcase_templates + guest_authorizations
-- Created: 2026-03-07

CREATE TABLE IF NOT EXISTS "showcase_templates" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_type" varchar(100) NOT NULL,
  "title" varchar(200) NOT NULL,
  "subtitle" text,
  "description" text,
  "equipment_images" jsonb DEFAULT '[]'::jsonb,
  "operation_videos" jsonb DEFAULT '[]'::jsonb,
  "hero_video_url" text,
  "takt_time_seconds" numeric(10,2),
  "cleaning_efficiency" varchar(100),
  "cleanliness_standard" varchar(200),
  "throughput_per_hour" integer,
  "power_consumption_kw" numeric(8,2),
  "price_range_min" numeric(14,2),
  "price_range_max" numeric(14,2),
  "price_currency" varchar(10) DEFAULT 'EUR',
  "roi_months" integer,
  "configurations" jsonb DEFAULT '[]'::jsonb,
  "technical_specs" jsonb DEFAULT '{}'::jsonb,
  "is_active" boolean DEFAULT true,
  "created_by" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guest_authorizations" (
  "id" serial PRIMARY KEY NOT NULL,
  "showcase_id" integer NOT NULL,
  "target_client" varchar(200) NOT NULL,
  "contact_person" varchar(200),
  "contact_email" varchar(200),
  "welcome_message" text,
  "access_token" varchar(64) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "max_views" integer DEFAULT 100,
  "view_count" integer DEFAULT 0 NOT NULL,
  "first_viewed_at" timestamp,
  "last_viewed_at" timestamp,
  "is_revoked" boolean DEFAULT false,
  "revoked_at" timestamp,
  "revoked_reason" text,
  "created_by" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "st_product_type_idx" ON "showcase_templates" USING btree ("product_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "st_is_active_idx" ON "showcase_templates" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "st_created_at_idx" ON "showcase_templates" USING btree ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ga_access_token_idx" ON "guest_authorizations" USING btree ("access_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ga_showcase_id_idx" ON "guest_authorizations" USING btree ("showcase_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ga_target_client_idx" ON "guest_authorizations" USING btree ("target_client");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ga_expires_at_idx" ON "guest_authorizations" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ga_is_revoked_idx" ON "guest_authorizations" USING btree ("is_revoked");
