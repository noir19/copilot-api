import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import {
  createModelMapping,
  getModelMappingRepository,
  getModelMappingStore,
  getRequestLogRepository,
  removeModelMapping,
  updateModelMapping,
} from "./db/runtime"
import { honoPrintFn } from "./lib/logger"
import { completionRoutes } from "./routes/chat-completions/route"
import { createDashboardRoute } from "./routes/dashboard/route"
import { embeddingRoutes } from "./routes/embeddings/route"
import { messageRoutes } from "./routes/messages/route"
import { modelRoutes } from "./routes/models/route"
import { tokenRoute } from "./routes/token/route"
import { usageRoute } from "./routes/usage/route"
import { getCopilotUsage } from "./services/github/get-copilot-usage"

export const server = new Hono()

server.use(logger(honoPrintFn))
server.use(cors())

server.get("/", (c) => c.text("Server running"))

server.route("/chat/completions", completionRoutes)
server.route("/models", modelRoutes)
server.route("/embeddings", embeddingRoutes)
server.route("/usage", usageRoute)
server.route("/token", tokenRoute)
server.route(
  "/api/dashboard",
  createDashboardRoute({
    getUsage: getCopilotUsage,
    getOverview: () => getRequestLogRepository().getOverview(),
    getModelBreakdown: () => getRequestLogRepository().getModelBreakdown(),
    getRecentRequests: (options) =>
      getRequestLogRepository().getRecentRequests(options),
    listMappings: () => getModelMappingRepository().list(),
    createMapping: createModelMapping,
    updateMapping: updateModelMapping,
    removeMapping: removeModelMapping,
    getMappingSnapshot: () => getModelMappingStore().getSnapshot(),
  }),
)

// Compatibility with tools that expect v1/ prefix
server.route("/v1/chat/completions", completionRoutes)
server.route("/v1/models", modelRoutes)
server.route("/v1/embeddings", embeddingRoutes)

// Anthropic compatible endpoints
server.route("/v1/messages", messageRoutes)
