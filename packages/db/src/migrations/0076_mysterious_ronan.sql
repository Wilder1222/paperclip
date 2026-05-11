CREATE TABLE "kb_collections" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "company_id" uuid NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "description" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "kb_entries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "company_id" uuid NOT NULL,
    "document_id" uuid NOT NULL,
    "collection_id" uuid,
    "slug" text NOT NULL,
    "title" text NOT NULL,
    "summary" text,
    "tags" text [] DEFAULT '{}' NOT NULL,
    "doc_type" text DEFAULT 'general' NOT NULL,
    "status" text DEFAULT 'draft' NOT NULL,
    "source_issue_id" uuid,
    "source_run_id" uuid,
    "owner_user_id" text,
    "owner_agent_id" uuid,
    "created_by_agent_id" uuid,
    "created_by_user_id" text,
    "review_requested_at" timestamp with time zone,
    "review_due_at" timestamp with time zone,
    "reviewed_by_user_id" text,
    "reviewed_at" timestamp with time zone,
    "last_reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE
    "kb_collections"
ADD
    CONSTRAINT "kb_collections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
    "kb_entries"
ADD
    CONSTRAINT "kb_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
    "kb_entries"
ADD
    CONSTRAINT "kb_entries_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
    "kb_entries"
ADD
    CONSTRAINT "kb_entries_collection_id_kb_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."kb_collections"("id") ON DELETE
set
    null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
    "kb_entries"
ADD
    CONSTRAINT "kb_entries_source_issue_id_issues_id_fk" FOREIGN KEY ("source_issue_id") REFERENCES "public"."issues"("id") ON DELETE
set
    null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
    "kb_entries"
ADD
    CONSTRAINT "kb_entries_owner_agent_id_agents_id_fk" FOREIGN KEY ("owner_agent_id") REFERENCES "public"."agents"("id") ON DELETE
set
    null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE
    "kb_entries"
ADD
    CONSTRAINT "kb_entries_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE
set
    null ON UPDATE no action;

--> statement-breakpoint
CREATE UNIQUE INDEX "kb_collections_company_slug_uq" ON "kb_collections" USING btree ("company_id", "slug");

--> statement-breakpoint
CREATE UNIQUE INDEX "kb_entries_company_slug_uq" ON "kb_entries" USING btree ("company_id", "slug");

--> statement-breakpoint
CREATE INDEX "kb_entries_company_status_idx" ON "kb_entries" USING btree ("company_id", "status");

--> statement-breakpoint
CREATE INDEX "kb_entries_company_collection_idx" ON "kb_entries" USING btree ("company_id", "collection_id");

--> statement-breakpoint
CREATE INDEX "kb_entries_company_updated_idx" ON "kb_entries" USING btree ("company_id", "updated_at");

--> statement-breakpoint
CREATE INDEX "kb_entries_source_issue_idx" ON "kb_entries" USING btree ("source_issue_id");