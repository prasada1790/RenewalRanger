import { mysqlTable, varchar, int, mysqlEnum, timestamp, json, primaryKey } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: mysqlEnum("role", ["admin", "staff"]).notNull().default("staff"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  renewables: many(renewables, { relationName: "assignedRenewables" }),
  remindersSent: many(reminderLogs, { relationName: "userReminderLogs" }),
}));

// Clients
export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 255 }),
  address: varchar("address", { length: 512 }),
  notes: varchar("notes", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clientsRelations = relations(clients, ({ many }) => ({
  renewables: many(renewables, { relationName: "clientRenewables" }),
}));

// Item Types
export const itemTypes = mysqlTable("item_types", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  defaultRenewalPeriod: int("default_renewal_period").notNull(), // in days
  defaultReminderIntervals: json("default_reminder_intervals").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const itemTypesRelations = relations(itemTypes, ({ many }) => ({
  renewables: many(renewables, { relationName: "typeRenewables" }),
}));

// Renewables
export const renewables = mysqlTable("renewables", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  typeId: int("type_id").notNull().references(() => itemTypes.id, { onDelete: 'restrict' }),
  assignedToId: int("assigned_to_id").references(() => users.id, { onDelete: 'set null' }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  amount: int("amount"), // Amount to renew
  reminderIntervals: json("reminder_intervals"), // null means use defaults
  notes: varchar("notes", { length: 1000 }),
  status: mysqlEnum("status", ["active", "renewed", "expired", "cancelled"]).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const renewablesRelations = relations(renewables, ({ one, many }) => ({
  client: one(clients, {
    fields: [renewables.clientId],
    references: [clients.id],
    relationName: "clientRenewables",
  }),
  type: one(itemTypes, {
    fields: [renewables.typeId],
    references: [itemTypes.id],
    relationName: "typeRenewables",
  }),
  assignedTo: one(users, {
    fields: [renewables.assignedToId],
    references: [users.id],
    relationName: "assignedRenewables",
  }),
  reminderLogs: many(reminderLogs, { relationName: "renewableReminderLogs" }),
}));

// Reminder Logs
export const reminderLogs = mysqlTable("reminder_logs", {
  id: int("id").primaryKey().autoincrement(),
  renewableId: int("renewable_id").notNull().references(() => renewables.id, { onDelete: 'cascade' }),
  sentToId: int("sent_to_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  daysBeforeExpiry: int("days_before_expiry").notNull(),
  emailContent: varchar("email_content", { length: 2000 }).notNull(),
  emailSentTo: varchar("email_sent_to", { length: 255 }).notNull(),
});

export const reminderLogsRelations = relations(reminderLogs, ({ one }) => ({
  renewable: one(renewables, {
    fields: [reminderLogs.renewableId],
    references: [renewables.id],
    relationName: "renewableReminderLogs",
  }),
  sentTo: one(users, {
    fields: [reminderLogs.sentToId],
    references: [users.id],
    relationName: "userReminderLogs",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true })
  .extend({
    passwordConfirm: z.string().optional(),
  })
  .refine(data => !data.password || data.password === data.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"]
  });

export const insertClientSchema = createInsertSchema(clients)
  .omit({ id: true, createdAt: true });

export const insertItemTypeSchema = createInsertSchema(itemTypes)
  .omit({ id: true, createdAt: true });

export const insertRenewableSchema = createInsertSchema(renewables)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertReminderLogSchema = createInsertSchema(reminderLogs)
  .omit({ id: true, sentAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertItemType = z.infer<typeof insertItemTypeSchema>;
export type ItemType = typeof itemTypes.$inferSelect;

export type InsertRenewable = z.infer<typeof insertRenewableSchema>;
export type Renewable = typeof renewables.$inferSelect;

export type InsertReminderLog = z.infer<typeof insertReminderLogSchema>;
export type ReminderLog = typeof reminderLogs.$inferSelect;

// Login schema (for login form)
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginData = z.infer<typeof loginSchema>;
