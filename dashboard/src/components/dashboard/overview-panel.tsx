import { Activity, Cable, Clock3, Cpu } from "lucide-react"

import type { DashboardData } from "../../lib/dashboard-api"

import { formatNumber, formatPercent } from "../../lib/format"
import { MetricCard } from "./metric-card"
import { ModelBreakdownCard } from "./model-breakdown-card"
import { ModelDistributionCard } from "./model-distribution-card"
import { RecentRequestsCard } from "./recent-requests-card"
import { UsageCard, UsageSummaryCard } from "./usage-card"

export function OverviewPanel({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          description="SQLite 中已记录的全部请求"
          icon={Cable}
          title="总请求数"
          value={formatNumber(data.overview.totalRequests)}
        />
        <MetricCard
          description="成功返回的 API 请求"
          icon={Activity}
          title="成功率"
          value={formatPercent(data.overview.successRate)}
        />
        <MetricCard
          description="日志中累计记录的 Token"
          icon={Cpu}
          title="总 Token"
          value={formatNumber(data.overview.totalTokens)}
        />
        <MetricCard
          description="所有已记录请求的平均耗时"
          icon={Clock3}
          title="平均延迟"
          value={`${formatNumber(data.overview.averageLatencyMs)} ms`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <ModelDistributionCard requestModels={data.requestModels} />
        </div>
        <div className="xl:col-span-4">
          <UsageSummaryCard usage={data.usage} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <ModelBreakdownCard requestModels={data.requestModels} />
        </div>
        <div className="xl:col-span-8">
          <RecentRequestsCard recentRequests={data.recentRequests} />
        </div>
      </div>

      <UsageCard usage={data.usage} />
    </div>
  )
}
