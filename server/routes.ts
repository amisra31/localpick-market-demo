import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerApiRoutes } from "./routes/api";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all API routes
  registerApiRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
