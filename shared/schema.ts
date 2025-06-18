import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role", { enum: ["user", "merchant", "admin"] }).notNull().default("user"),
  shop_id: text("shop_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category", { enum: ["Food", "Gifts", "Souvenirs", "Other"] }).notNull(),
  location: text("location").notNull(),
  hours: text("hours").notNull(),
  owner_id: integer("owner_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  shop_id: integer("shop_id").references(() => shops.id).notNull(),
  name: text("name").notNull(),
  image: text("image").notNull(),
  price: integer("price").notNull(), // Price in cents
  description: text("description").notNull(),
  stock: integer("stock").notNull().default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  product_id: integer("product_id").references(() => products.id).notNull(),
  shop_id: integer("shop_id").references(() => shops.id).notNull(),
  user_id: integer("user_id").references(() => users.id),
  customer_name: text("customer_name").notNull(),
  email: text("email"),
  status: text("status", { enum: ["active", "picked_up", "cancelled"] }).notNull().default("active"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  role: true,
  shop_id: true,
});

export const insertShopSchema = createInsertSchema(shops).pick({
  name: true,
  category: true,
  location: true,
  hours: true,
  owner_id: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  shop_id: true,
  name: true,
  image: true,
  price: true,
  description: true,
  stock: true,
});

export const insertReservationSchema = createInsertSchema(reservations).pick({
  product_id: true,
  shop_id: true,
  user_id: true,
  customer_name: true,
  email: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shops.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservations.$inferSelect;
