import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Owner-managed catalog. Each row stores one product as validated JSON so new
// product fields (regions, shipping notes, price dates) don't need a migration.
export const products = pgTable("products", {
  id: text().primaryKey(),
  position: integer().notNull().default(0),
  data: jsonb().notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
