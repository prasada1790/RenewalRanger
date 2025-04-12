import { pgTable, text, serial, integer, boolean, timestamp, unique, primaryKey, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["admin", "staff"] }).notNull().default("staff"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  renewables: many(renewables, { relationName: "assignedRenewables" }),
  remindersSent: many(reminderLogs, { relationName: "userReminderLogs" }),
}));

// Clients
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clientsRelations = relations(clients, ({ many }) => ({
  renewables: many(renewables, { relationName: "clientRenewables" }),
}));

// Item Types
export const itemTypes = pgTable("item_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  defaultRenewalPeriod: integer("default_renewal_period").notNull(), // in days
  defaultReminderIntervals: json("default_reminder_intervals").$type<number[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const itemTypesRelations = relations(itemTypes, ({ many }) => ({
  renewables: many(renewables, { relationName: "typeRenewables" }),
}));

// Renewables
export const renewables = pgTable("renewables", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  typeId: integer("type_id").notNull().references(() => itemTypes.id, { onDelete: 'restrict' }),
  assignedToId: integer("assigned_to_id").references(() => users.id, { onDelete: 'set null' }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reminderIntervals: json("reminder_intervals").$type<number[]>(), // null means use defaults
  notes: text("notes"),
  status: text("status", { enum: ["active", "renewed", "expired", "cancelled"] }).notNull().default("active"),
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
export const reminderLogs = pgTable("reminder_logs", {
  id: serial("id").primaryKey(),
  renewableId: integer("renewable_id").notNull().references(() => renewables.id, { onDelete: 'cascade' }),
  sentToId: integer("sent_to_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  daysBeforeExpiry: integer("days_before_expiry").notNull(),
  emailContent: text("email_content").notNull(),
  emailSentTo: text("email_sent_to").notNull(),
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
    passwordConfirm: z.string(),
  })
  .refine(data => data.password === data.passwordConfirm, {
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
