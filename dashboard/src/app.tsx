import {
  Activity,
  Bot,
  Database,
  FileText,
  RefreshCcw,
  Settings2,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { ModelConfigPanel } from "./components/dashboard/model-config-panel"
import { OverviewPanel } from "./components/dashboard/overview-panel"
import { RequestLogsPanel } from "./components/dashboard/request-logs-panel"
import { SettingsPanel } from "./components/dashboard/settings-panel"
import { Badge } from "./components/ui/badge"
import { Button } from "./components/ui/button"
import { Card, CardContent } from "./components/ui/card"
import {
  type AliasesResponse,
  type DashboardData,
  loadAliases,
  loadDashboardData,
} from "./lib/dashboard-api"
import { formatNumber } from "./lib/format"
import { cn } from "./lib/utils"

type DashboardTab = "overview" | "logs" | "models" | "settings"

const TAB_ITEMS: Array<{
  icon: typeof Activity
  key: DashboardTab
  label: string
}> = [
  { icon: Activity, key: "overview", label: "概览" },
  { icon: FileText, key: "logs", label: "日志" },
  { icon: Bot, key: "models", label: "模型映射" },
  { icon: Settings2, key: "settings", label: "设置" },
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
    <header className="rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-2.5 text-white shadow-md shadow-violet-500/20">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-950">
              Copilot API 控制台
            </h1>
            <p className="text-xs text-slate-500">
              数据来自 SQLite 请求日志与 Copilot usage 接口
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-500 text-white">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            运行中
          </Badge>
          <Badge className="bg-white text-slate-600">
            {dashboardData
              ? `${formatNumber(dashboardData.overview.totalRequests)} 次请求`
              : "加载中"}
          </Badge>
          <Button
            disabled={isRefreshing}
            onClick={onRefresh}
            size="sm"
            variant="outline"
          >
            <RefreshCcw
              className={cn(
                "mr-1.5 h-3.5 w-3.5",
                isRefreshing && "animate-spin",
              )}
            />
            刷新
          </Button>
        </div>
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
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/70 bg-white/60 p-2 shadow-sm backdrop-blur">
      {TAB_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.key
        return (
          <Button
            className={cn(
              "gap-2 rounded-xl transition-all",
              isActive && "shadow-sm",
            )}
            key={item.key}
            onClick={() => onSelect(item.key)}
            variant={isActive ? "default" : "ghost"}
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
  aliasesResponse,
  dashboardData,
  error,
  isLoading,
  onRefresh,
}: {
  activeTab: DashboardTab
  aliasesResponse: AliasesResponse | null
  dashboardData: DashboardData | null
  error: string | null
  isLoading: boolean
  onRefresh: () => Promise<void>
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
          正在加载面板数据...
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

  if (!dashboardData || !aliasesResponse) {
    return null
  }

  return (
    <>
      {activeTab === "overview" ? <OverviewPanel data={dashboardData} /> : null}
      {activeTab === "logs" ? (
        <RequestLogsPanel allModels={dashboardData.requestModels} />
      ) : null}
      {activeTab === "models" ? (
        <ModelConfigPanel
          aliases={aliasesResponse}
          onChanged={onRefresh}
          supportedModels={dashboardData.supportedModels}
        />
      ) : null}
      {activeTab === "settings" ? <SettingsPanel /> : null}
    </>
  )
}

export function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview")
  const [aliasesResponse, setAliasesResponse] =
    useState<AliasesResponse | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const [data, aliases] = await Promise.all([
        loadDashboardData(),
        loadAliases(),
      ])
      setDashboardData(data)
      setAliasesResponse(aliases)
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "加载面板数据失败",
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
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <DashboardHeader
          dashboardData={dashboardData}
          isRefreshing={isRefreshing}
          onRefresh={() => void refresh()}
        />
        <DashboardTabs activeTab={activeTab} onSelect={setActiveTab} />
        <DashboardContent
          activeTab={activeTab}
          aliasesResponse={aliasesResponse}
          dashboardData={dashboardData}
          error={error}
          isLoading={isLoading}
          onRefresh={refresh}
        />
      </div>
    </div>
  )
}
