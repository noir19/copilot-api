import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import {
  createModelAlias,
  getDashboardMetaRepository,
  getModelAliasRepository,
  getModelAliasStore,
  getOpenRouterPricingService,
  getRequestLogRepository,
  getRequestSinkConfig,
  reconfigureRequestSink,
  removeModelAlias,
  updateModelAlias,
} from "./db/runtime"
import { honoPrintFn } from "./lib/logger"
import { state } from "./lib/state"
import { cacheModels } from "./lib/utils"
import { completionRoutes } from "./routes/chat-completions/route"
import {
  serveDashboardAsset,
  serveDashboardIndex,
} from "./routes/dashboard/assets"
import { createDashboardRoute } from "./routes/dashboard/route"
import { embeddingRoutes } from "./routes/embeddings/route"
import { messageRoutes } from "./routes/messages/route"
import { modelRoutes } from "./routes/models/route"
import { tokenRoute } from "./routes/token/route"
import { usageRoute } from "./routes/usage/route"
import { getCopilotUsage } from "./services/github/get-copilot-usage"

export const server = new Hono()
const openRouterPricing = getOpenRouterPricingService()

server.use(logger(honoPrintFn))
server.use(cors())

server.get("/", (c) => c.text("Server running"))
server.get("/dashboard", () => serveDashboardIndex())
server.get("/dashboard/", () => serveDashboardIndex())
server.get("/dashboard/assets/*", (c) => serveDashboardAsset(c.req.path))
server.get("/dashboard/*", (c) => serveDashboardAsset(c.req.path))

server.route("/chat/completions", completionRoutes)
server.route("/models", modelRoutes)
server.route("/embeddings", embeddingRoutes)
server.route("/usage", usageRoute)
server.route("/token", tokenRoute)
server.route(
  "/api/dashboard",
  createDashboardRoute({
    createAlias: createModelAlias,
    getSupportedModels: async () => {
      if (!state.models) {
        await cacheModels()
      }

      return state.models?.data ?? []
    },
    refreshSupportedModels: async () => {
      const models = await cacheModels()
      return models.data
    },
    getUsage: getCopilotUsage,
    getOverview: async (filter) => {
      return getRequestLogRepository().getOverview(filter)
    },
    getModelBreakdown: async (filter) => {
      const rows = await getRequestLogRepository().getModelBreakdown(filter)

      return Promise.all(
        rows.map(async (row) => {
          if (row.openRouterModelId || row.modelRaw == null) {
            return row
          }

          const pricing = await openRouterPricing.getPricing(row.modelRaw)

          return {
            ...row,
            openRouterModelId: pricing?.modelId ?? null,
          }
        }),
      )
    },
    listAliases: () => getModelAliasRepository().list(),
    getRecentRequests: (options) =>
      getRequestLogRepository().getRecentRequests(options),
    countRequests: (filter) => getRequestLogRepository().countRequests(filter),
    removeAlias: removeModelAlias,
    updateAlias: updateModelAlias,
    getTimeSeries: (options) =>
      getRequestLogRepository().getTimeSeries(options),
    getAliasSnapshot: () => getModelAliasStore().getSnapshot(),
    getSettings: () => getDashboardMetaRepository().getAll(),
    updateSettings: (entries) => {
      const repo = getDashboardMetaRepository()
      for (const [key, value] of Object.entries(entries)) {
        repo.set(key, value)
      }
    },
    reconfigureSink: reconfigureRequestSink,
    getSinkConfig: getRequestSinkConfig,
  }),
)

// Compatibility with tools that expect v1/ prefix
server.route("/v1/chat/completions", completionRoutes)
server.route("/v1/models", modelRoutes)
server.route("/v1/embeddings", embeddingRoutes)

// Anthropic compatible endpoints
server.route("/v1/messages", messageRoutes)
