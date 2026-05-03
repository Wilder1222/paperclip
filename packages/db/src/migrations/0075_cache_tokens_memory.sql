--> statement-breakpoint
ALTER TABLE "cost_events" ADD COLUMN "cache_creation_tokens" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE "memory_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"scope_type" text NOT NULL DEFAULT 'company',
	"scope_id" uuid NOT NULL,
	"agent_id" uuid,
	"provider_type" text NOT NULL,
	"provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"label" text,
	"is_active" boolean NOT NULL DEFAULT true,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "memory_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"binding_id" uuid NOT NULL,
	"agent_id" uuid,
	"heartbeat_run_id" uuid,
	"issue_id" uuid,
	"operation_kind" text NOT NULL,
	"item_count" integer NOT NULL DEFAULT 0,
	"token_count" integer NOT NULL DEFAULT 0,
	"latency_ms" integer,
	"status" text NOT NULL DEFAULT 'ok',
	"error_message" text,
	"occurred_at" timestamp with time zone NOT NULL DEFAULT now(),
	"created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "memory_bindings" ADD CONSTRAINT "memory_bindings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memory_bindings" ADD CONSTRAINT "memory_bindings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memory_operations" ADD CONSTRAINT "memory_operations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memory_operations" ADD CONSTRAINT "memory_operations_binding_id_memory_bindings_id_fk" FOREIGN KEY ("binding_id") REFERENCES "public"."memory_bindings"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memory_operations" ADD CONSTRAINT "memory_operations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memory_operations" ADD CONSTRAINT "memory_operations_heartbeat_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("heartbeat_run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memory_operations" ADD CONSTRAINT "memory_operations_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "memory_bindings_company_scope_active_idx" ON "memory_bindings" USING btree ("company_id","scope_type","scope_id","is_active");
--> statement-breakpoint
CREATE INDEX "memory_bindings_company_provider_idx" ON "memory_bindings" USING btree ("company_id","provider_type");
--> statement-breakpoint
CREATE INDEX "memory_operations_company_occurred_idx" ON "memory_operations" USING btree ("company_id","occurred_at");
--> statement-breakpoint
CREATE INDEX "memory_operations_company_agent_idx" ON "memory_operations" USING btree ("company_id","agent_id");
--> statement-breakpoint
CREATE INDEX "memory_operations_company_binding_idx" ON "memory_operations" USING btree ("company_id","binding_id");
--> statement-breakpoint
CREATE INDEX "memory_operations_company_run_idx" ON "memory_operations" USING btree ("company_id","heartbeat_run_id");
