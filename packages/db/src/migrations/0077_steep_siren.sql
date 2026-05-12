CREATE TABLE "company_staff_bench_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_id" uuid,
	"status" text DEFAULT 'reserve' NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'general' NOT NULL,
	"title" text,
	"icon" text,
	"reports_to_agent_id" uuid,
	"desired_skills" text[] DEFAULT '{}' NOT NULL,
	"adapter_type" text DEFAULT 'process' NOT NULL,
	"adapter_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"runtime_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_environment_id" uuid,
	"budget_monthly_cents" integer DEFAULT 0 NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"activated_agent_id" uuid,
	"activated_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_staff_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"source_locator" text,
	"source_ref" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_staff_bench_entries" ADD CONSTRAINT "company_staff_bench_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_staff_bench_entries" ADD CONSTRAINT "company_staff_bench_entries_source_id_company_staff_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."company_staff_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_staff_bench_entries" ADD CONSTRAINT "company_staff_bench_entries_reports_to_agent_id_agents_id_fk" FOREIGN KEY ("reports_to_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_staff_bench_entries" ADD CONSTRAINT "company_staff_bench_entries_default_environment_id_environments_id_fk" FOREIGN KEY ("default_environment_id") REFERENCES "public"."environments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_staff_bench_entries" ADD CONSTRAINT "company_staff_bench_entries_activated_agent_id_agents_id_fk" FOREIGN KEY ("activated_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_staff_sources" ADD CONSTRAINT "company_staff_sources_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_staff_bench_entries_company_status_idx" ON "company_staff_bench_entries" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "company_staff_bench_entries_company_reports_to_idx" ON "company_staff_bench_entries" USING btree ("company_id","reports_to_agent_id");--> statement-breakpoint
CREATE INDEX "company_staff_bench_entries_company_activated_agent_idx" ON "company_staff_bench_entries" USING btree ("company_id","activated_agent_id");--> statement-breakpoint
CREATE INDEX "company_staff_sources_company_source_type_idx" ON "company_staff_sources" USING btree ("company_id","source_type");