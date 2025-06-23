import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - handles authentication and basic user info
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role", { enum: ["user", "merchant", "admin"] }).notNull().default("user"),
  created_at: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updated_at: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

// Shops table - comprehensive shop information
export const shops = sqliteTable("shops", {
  id: text("id").primaryKey(), // Use text ID to match existing mock data
  name: text("name").notNull(),
  category: text("category", { enum: ["Food", "Gifts", "Souvenirs", "Other"] }).notNull(),
  location: text("location").notNull(),
  phone: text("phone"),
  hours: text("hours").notNull(),
  business_email: text("business_email"),
  website: text("website"),
  social_links: text("social_links"),
  about_shop: text("about_shop"),
  shop_photo: text("shop_photo"),
  status: text("status", { enum: ["draft", "pending_approval", "approved", "rejected"] }).notNull().default("draft"),
  owner_id: text("owner_id").notNull(), // References users.id as text
  submitted_at: integer("submitted_at"),
  approved_at: integer("approved_at"),
  rejected_at: integer("rejected_at"),
  rejection_reason: text("rejection_reason"),
  created_at: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updated_at: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

// Products table - shop inventory management
export const products = sqliteTable("products", {
  id: text("id").primaryKey(), // Use text ID to match existing mock data
  shop_id: text("shop_id").references(() => shops.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  image: text("image").notNull(),
  price: real("price").notNull(), // Real for pricing in SQLite
  description: text("description").notNull(),
  stock: integer("stock").notNull().default(0),
  is_archived: integer("is_archived", { mode: "boolean" }).default(false),
  archived_at: integer("archived_at"),
  created_at: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updated_at: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

// Orders table - customer order management (includes reservations)
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), // Use text ID to match existing mock data
  shop_id: text("shop_id").references(() => shops.id, { onDelete: "cascade" }).notNull(),
  product_id: text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  customer_id: text("customer_id").notNull(), // Can reference users.id or be standalone
  customer_name: text("customer_name").notNull(),
  customer_phone: text("customer_phone"),
  customer_email: text("customer_email"),
  delivery_address: text("delivery_address"),
  quantity: integer("quantity").notNull().default(1),
  total_amount: real("total_amount").notNull(),
  status: text("status", { enum: ["pending", "reserved", "in_progress", "delivered", "cancelled"] }).notNull().default("pending"),
  order_type: text("order_type", { enum: ["order", "reservation"] }).notNull().default("order"),
  created_at: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updated_at: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

// Order messages table - customer-merchant communication
export const order_messages = sqliteTable("order_messages", {
  id: text("id").primaryKey(),
  order_id: text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  sender_id: text("sender_id").notNull(), // Can be user_id or shop owner_id
  sender_type: text("sender_type", { enum: ["merchant", "customer"] }).notNull(),
  message: text("message").notNull(),
  created_at: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

// Direct messages table for customer-merchant chat (not tied to specific orders)
export const direct_messages = sqliteTable("direct_messages", {
  id: text("id").primaryKey(),
  customer_id: text("customer_id").notNull(), // Customer's user ID
  shop_id: text("shop_id").references(() => shops.id, { onDelete: "cascade" }).notNull(),
  product_id: text("product_id").references(() => products.id, { onDelete: "set null" }), // Optional: product context
  sender_id: text("sender_id").notNull(), // Either customer_id or shop owner_id
  sender_type: text("sender_type", { enum: ["merchant", "customer"] }).notNull(),
  message: text("message").notNull(),
  is_read: integer("is_read", { mode: "boolean" }).notNull().default(false),
  created_at: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

// Operating hours table - detailed shop hours (normalized)
export const operating_hours = sqliteTable("operating_hours", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shop_id: text("shop_id").references(() => shops.id, { onDelete: "cascade" }).notNull(),
  day_of_week: text("day_of_week", { 
    enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] 
  }).notNull(),
  is_open: integer("is_open", { mode: "boolean" }).notNull().default(true),
  open_time: text("open_time"), // Format: "HH:MM"
  close_time: text("close_time"), // Format: "HH:MM"
  created_at: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updated_at: integer("updated_at").notNull().$defaultFn(() => Date.now()),
});

// Reservations table - legacy support for existing reservation system
export const reservations = sqliteTable("reservations", {
  id: text("id").primaryKey(),
  product_id: text("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  shop_id: text("shop_id").references(() => shops.id, { onDelete: "cascade" }).notNull(),
  customer_name: text("customer_name").notNull(),
  email: text("email"),
  status: text("status", { enum: ["active", "picked_up", "cancelled"] }).notNull().default("active"),
  created_at: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  role: true,
});

export const insertShopSchema = createInsertSchema(shops).pick({
  id: true,
  name: true,
  category: true,
  location: true,
  phone: true,
  hours: true,
  business_email: true,
  website: true,
  social_links: true,
  about_shop: true,
  shop_photo: true,
  status: true,
  owner_id: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  id: true,
  shop_id: true,
  name: true,
  image: true,
  price: true,
  description: true,
  stock: true,
  is_archived: true,
  archived_at: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  id: true,
  shop_id: true,
  product_id: true,
  customer_id: true,
  customer_name: true,
  customer_phone: true,
  customer_email: true,
  delivery_address: true,
  quantity: true,
  total_amount: true,
  status: true,
  order_type: true,
});

export const insertOrderMessageSchema = createInsertSchema(order_messages).pick({
  id: true,
  order_id: true,
  sender_id: true,
  sender_type: true,
  message: true,
});

export const insertDirectMessageSchema = createInsertSchema(direct_messages).pick({
  id: true,
  customer_id: true,
  shop_id: true,
  product_id: true,
  sender_id: true,
  sender_type: true,
  message: true,
  is_read: true,
});

export const insertOperatingHoursSchema = createInsertSchema(operating_hours).pick({
  shop_id: true,
  day_of_week: true,
  is_open: true,
  open_time: true,
  close_time: true,
});

export const insertReservationSchema = createInsertSchema(reservations).pick({
  id: true,
  product_id: true,
  shop_id: true,
  customer_name: true,
  email: true,
  status: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Shop = typeof shops.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderMessage = typeof order_messages.$inferSelect;
export type DirectMessage = typeof direct_messages.$inferSelect;
export type InsertOrderMessage = z.infer<typeof insertOrderMessageSchema>;

export type OperatingHours = typeof operating_hours.$inferSelect;
export type InsertOperatingHours = z.infer<typeof insertOperatingHoursSchema>;

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;