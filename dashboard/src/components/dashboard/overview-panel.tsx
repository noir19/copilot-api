import { Activity, Cable, Clock3, Cpu } from "lucide-react"

import type { DashboardData } from "../../lib/dashboard-api"

import { formatNumber, formatPercent } from "../../lib/format"
import { MetricCard } from "./metric-card"
import { ModelDistributionCard } from "./model-distribution-card"
import { RequestTrendCard } from "./request-trend-card"
import { UsageCard } from "./usage-card"

export function OverviewPanel({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          colorIndex={0}
          icon={Cable}
          title="总请求数"
          value={formatNumber(data.overview.totalRequests)}
        />
        <MetricCard
          colorIndex={1}
          icon={Activity}
          title="成功率"
          value={formatPercent(data.overview.successRate)}
        />
        <MetricCard
          colorIndex={2}
          icon={Cpu}
          title="总 Token"
          value={formatNumber(data.overview.totalTokens)}
        />
        <MetricCard
          colorIndex={3}
          icon={Clock3}
          title="平均延迟"
          value={`${formatNumber(data.overview.averageLatencyMs)} ms`}
        />
      </div>

      <RequestTrendCard initialData={data.timeSeries} />

      <div className="grid gap-4 xl:grid-cols-10">
        <div className="xl:col-span-6">
          <ModelDistributionCard requestModels={data.requestModels} />
        </div>
        <div className="xl:col-span-4">
          <UsageCard usage={data.usage} />
        </div>
      </div>
    </div>
  )
}
