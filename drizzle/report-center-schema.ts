/**
 * Report Center Schema — Live Executive Briefing Center (动态汇报中枢)
 *
 * sys_reports: stores structured report content as JSON blocks,
 * supporting full-screen projector presentations.
 */
import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

export const sysReports = pgTable(
  "sys_reports",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    authorId: integer("author_id"),
    authorName: varchar("author_name", { length: 100 }),
    department: varchar("department", { length: 100 }),
    reportType: varchar("report_type", { length: 50 }),
    contentBlocks: jsonb("content_blocks").$type<
      Array<{
        type: "title" | "text" | "metric" | "divider";
        title?: string;
        content?: string;
        value?: string;
        unit?: string;
        icon?: string;
        accent?: string;
        accentTo?: string;
      }>
    >(),
    status: varchar("status", { length: 20 }).default("DRAFT"),
    coverGradient: varchar("cover_gradient", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (table) => [
    index("idx_sys_reports_author").on(table.authorId),
    index("idx_sys_reports_status").on(table.status),
    index("idx_sys_reports_type").on(table.reportType),
    index("idx_sys_reports_created").on(table.createdAt),
  ]
);
