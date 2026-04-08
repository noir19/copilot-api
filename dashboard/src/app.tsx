import { Activity, Bot, Database, RefreshCcw, Settings2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { MappingsPanel } from "./components/dashboard/mappings-panel"
import { OverviewPanel } from "./components/dashboard/overview-panel"
import { SettingsPanel } from "./components/dashboard/settings-panel"
import { Badge } from "./components/ui/badge"
import { Button } from "./components/ui/button"
import { Card, CardContent } from "./components/ui/card"
import {
  type DashboardData,
  loadDashboardData,
  loadMappings,
  type MappingsResponse,
} from "./lib/dashboard-api"
import { formatNumber } from "./lib/format"
import { cn } from "./lib/utils"

type DashboardTab = "overview" | "mappings" | "settings"

const TAB_ITEMS: Array<{
  icon: typeof Activity
  key: DashboardTab
  label: string
}> = [
  { icon: Activity, key: "overview", label: "Overview" },
  { icon: Bot, key: "mappings", label: "Model Mappings" },
  { icon: Settings2, key: "settings", label: "Settings" },
]

function DashboardHeader({
  dashboardData,
  isRefreshing,
  onRefresh,
}: {
  dashboardData: DashboardData | null
  isRefreshing: boolean
  onRefresh: () => void
}) {
  return (
    <header className="flex flex-col gap-6 rounded-[28px] border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-950 p-3 text-slate-50 shadow-lg shadow-slate-900/10">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-amber-700">
              Copilot API Ops
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Usage and model control plane
            </h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Real dashboard data is sourced from SQLite request logs and the live
          Copilot usage endpoint. Model aliases are persisted in SQLite and
          served through the in-memory cache on the request path.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button disabled={isRefreshing} onClick={onRefresh} variant="outline">
          <RefreshCcw
            className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")}
          />
          Refresh
        </Button>
        <Badge className="bg-white text-slate-600">
          {dashboardData
            ? `${formatNumber(dashboardData.overview.totalRequests)} requests tracked`
            : "loading"}
        </Badge>
      </div>
    </header>
  )
}

function DashboardTabs({
  activeTab,
  onSelect,
}: {
  activeTab: DashboardTab
  onSelect: (tab: DashboardTab) => void
}) {
  return (
    <nav className="flex flex-wrap gap-2">
      {TAB_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <Button
            className="gap-2 rounded-full"
            key={item.key}
            onClick={() => onSelect(item.key)}
            variant={activeTab === item.key ? "default" : "outline"}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Button>
        )
      })}
    </nav>
  )
}

function DashboardContent({
  activeTab,
  dashboardData,
  error,
  isLoading,
  mappingsResponse,
  onRefresh,
}: {
  activeTab: DashboardTab
  dashboardData: DashboardData | null
  error: string | null
  isLoading: boolean
  mappingsResponse: MappingsResponse | null
  onRefresh: () => Promise<void>
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
          Loading dashboard data...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-rose-200">
        <CardContent className="flex min-h-[180px] items-center gap-3 text-rose-700">
          <span>{error}</span>
        </CardContent>
      </Card>
    )
  }

  if (!dashboardData || !mappingsResponse) {
    return null
  }

  return (
    <>
      {activeTab === "overview" ? <OverviewPanel data={dashboardData} /> : null}
      {activeTab === "mappings" ? (
        <MappingsPanel mappings={mappingsResponse} onChanged={onRefresh} />
      ) : null}
      {activeTab === "settings" ? <SettingsPanel /> : null}
    </>
  )
}

export function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview")
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [mappingsResponse, setMappingsResponse] =
    useState<MappingsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const [data, mappings] = await Promise.all([
        loadDashboardData(),
        loadMappings(),
      ])
      setDashboardData(data)
      setMappingsResponse(mappings)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Failed to load dashboard data",
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_30%),linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_42%,_#eef2ff_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <DashboardHeader
          dashboardData={dashboardData}
          isRefreshing={isRefreshing}
          onRefresh={() => void refresh()}
        />
        <DashboardTabs activeTab={activeTab} onSelect={setActiveTab} />
        <DashboardContent
          activeTab={activeTab}
          dashboardData={dashboardData}
          error={error}
          isLoading={isLoading}
          mappingsResponse={mappingsResponse}
          onRefresh={refresh}
        />
      </div>
    </div>
  )
}
