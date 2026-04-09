import { Activity, Bot, FileText, RefreshCcw, Settings2 } from "lucide-react"
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
            <svg
              className="h-4 w-4"
              fill="currentColor"
              role="img"
              viewBox="0 0 24 24"
              aria-label="GitHub Copilot"
            >
              <path d="M23.922 16.997C23.061 18.492 18.063 22.02 12 22.02 5.937 22.02.939 18.492.078 16.997A.641.641 0 0 1 0 16.741v-2.869a.883.883 0 0 1 .053-.22c.372-.935 1.347-2.292 2.605-2.656.167-.429.414-1.055.644-1.517a10.098 10.098 0 0 1-.052-1.086c0-1.331.282-2.499 1.132-3.368.397-.406.89-.717 1.474-.952C7.255 2.937 9.248 1.98 11.978 1.98c2.731 0 4.767.957 6.166 2.093.584.235 1.077.546 1.474.952.85.869 1.132 2.037 1.132 3.368 0 .368-.014.733-.052 1.086.23.462.477 1.088.644 1.517 1.258.364 2.233 1.721 2.605 2.656a.841.841 0 0 1 .053.22v2.869a.641.641 0 0 1-.078.256Zm-11.75-5.992h-.344a4.359 4.359 0 0 1-.355.508c-.77.947-1.918 1.492-3.508 1.492-1.725 0-2.989-.359-3.782-1.259a2.137 2.137 0 0 1-.085-.104L4 11.746v6.585c1.435.779 4.514 2.179 8 2.179 3.486 0 6.565-1.4 8-2.179v-6.585l-.098-.104s-.033.045-.085.104c-.793.9-2.057 1.259-3.782 1.259-1.59 0-2.738-.545-3.508-1.492a4.359 4.359 0 0 1-.355-.508Zm2.328 3.25c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm-5 0c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm3.313-6.185c.136 1.057.403 1.913.878 2.497.442.544 1.134.938 2.344.938 1.573 0 2.292-.337 2.657-.751.384-.435.558-1.15.558-2.361 0-1.14-.243-1.847-.705-2.319-.477-.488-1.319-.862-2.824-1.025-1.487-.161-2.192.138-2.533.529-.269.307-.437.808-.438 1.578v.021c0 .265.021.562.063.893Zm-1.626 0c.042-.331.063-.628.063-.894v-.02c-.001-.77-.169-1.271-.438-1.578-.341-.391-1.046-.69-2.533-.529-1.505.163-2.347.537-2.824 1.025-.462.472-.705 1.179-.705 2.319 0 1.211.175 1.926.558 2.361.365.414 1.084.751 2.657.751 1.21 0 1.902-.394 2.344-.938.475-.584.742-1.44.878-2.497Z" />
            </svg>
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
