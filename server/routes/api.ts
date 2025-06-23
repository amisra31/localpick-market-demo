import type { Express } from "express";
import { registerShopRoutes } from "./shops";
import { registerProductRoutes } from "./products";
import { registerOrderRoutes } from "./orders";
import { registerMessageRoutes } from "./messages";
import { registerLocationRoutes } from "./location";

export function registerApiRoutes(app: Express) {
  // Register all modular route handlers
  registerShopRoutes(app);
  registerProductRoutes(app);
  registerOrderRoutes(app);
  registerMessageRoutes(app);
  registerLocationRoutes(app);
}