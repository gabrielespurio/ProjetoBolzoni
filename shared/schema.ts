import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "employee"]);
export const eventStatusEnum = pgEnum("event_status", ["scheduled", "completed", "cancelled"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["receivable", "payable"]);
export const inventoryTypeEnum = pgEnum("inventory_type", ["consumable", "character"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("employee"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  city: text("city"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  email: text("email"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  categoryId: varchar("category_id").references(() => eventCategories.id),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  contractValue: decimal("contract_value", { precision: 10, scale: 2 }).notNull(),
  status: eventStatusEnum("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: inventoryTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull().default(0),
  minQuantity: integer("min_quantity").notNull().default(0),
  unit: text("unit"),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockMovements = pgTable("stock_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull().references(() => inventoryItems.id),
  eventId: varchar("event_id").references(() => events.id),
  quantity: integer("quantity").notNull(),
  type: text("type").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const financialTransactions = pgTable("financial_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: transactionTypeEnum("type").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  eventId: varchar("event_id").references(() => events.id),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  isPaid: boolean("is_paid").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplier: text("supplier").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  itemId: varchar("item_id").references(() => inventoryItems.id),
  purchaseDate: timestamp("purchase_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventEmployees = pgTable("event_employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
});

export const eventCharacters = pgTable("event_characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  characterId: varchar("character_id").notNull().references(() => inventoryItems.id),
});

export const eventCategories = pgTable("event_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeeRoles = pgTable("employee_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eventsRelations = relations(events, ({ one, many }) => ({
  client: one(clients, {
    fields: [events.clientId],
    references: [clients.id],
  }),
  category: one(eventCategories, {
    fields: [events.categoryId],
    references: [eventCategories.id],
  }),
  eventEmployees: many(eventEmployees),
  eventCharacters: many(eventCharacters),
  transactions: many(financialTransactions),
  stockMovements: many(stockMovements),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  events: many(events),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  eventEmployees: many(eventEmployees),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  stockMovements: many(stockMovements),
  purchases: many(purchases),
  eventCharacters: many(eventCharacters),
}));

export const eventEmployeesRelations = relations(eventEmployees, ({ one }) => ({
  event: one(events, {
    fields: [eventEmployees.eventId],
    references: [events.id],
  }),
  employee: one(employees, {
    fields: [eventEmployees.employeeId],
    references: [employees.id],
  }),
}));

export const eventCharactersRelations = relations(eventCharacters, ({ one }) => ({
  event: one(events, {
    fields: [eventCharacters.eventId],
    references: [events.id],
  }),
  character: one(inventoryItems, {
    fields: [eventCharacters.characterId],
    references: [inventoryItems.id],
  }),
}));

export const eventCategoriesRelations = relations(eventCategories, ({ many }) => ({
  events: many(events),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
});

export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({
  id: true,
  createdAt: true,
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
});

export const insertEventEmployeeSchema = createInsertSchema(eventEmployees).omit({
  id: true,
});

export const insertEventCharacterSchema = createInsertSchema(eventCharacters).omit({
  id: true,
});

export const insertEventCategorySchema = createInsertSchema(eventCategories).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeRoleSchema = createInsertSchema(employeeRoles).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;

export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

export type EventEmployee = typeof eventEmployees.$inferSelect;
export type InsertEventEmployee = z.infer<typeof insertEventEmployeeSchema>;

export type EventCharacter = typeof eventCharacters.$inferSelect;
export type InsertEventCharacter = z.infer<typeof insertEventCharacterSchema>;

export type EventCategory = typeof eventCategories.$inferSelect;
export type InsertEventCategory = z.infer<typeof insertEventCategorySchema>;

export type EmployeeRole = typeof employeeRoles.$inferSelect;
export type InsertEmployeeRole = z.infer<typeof insertEmployeeRoleSchema>;
