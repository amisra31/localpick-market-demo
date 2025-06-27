import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerApiRoutes } from "./routes/api";
import { registerImageRoutes } from "./routes/images";
import { initializeWebSocket } from "./websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all API routes
  registerApiRoutes(app);
  
  // Register image processing routes
  registerImageRoutes(app);

  const httpServer = createServer(app);

  // Initialize WebSocket server for real-time chat
  initializeWebSocket(httpServer);

  return httpServer;
}
