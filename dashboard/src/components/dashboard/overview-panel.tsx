import { Activity, Cable, Clock3, Cpu } from "lucide-react"

import type { DashboardData } from "../../lib/dashboard-api"

import { formatNumber, formatPercent } from "../../lib/format"
import { MetricCard } from "./metric-card"
import { ModelBreakdownCard } from "./model-breakdown-card"
import { ModelDistributionCard } from "./model-distribution-card"
import { RecentRequestsCard } from "./recent-requests-card"
import { UsageCard } from "./usage-card"

export function OverviewPanel({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          description="All persisted requests"
          icon={Cable}
          title="Total requests"
          value={formatNumber(data.overview.totalRequests)}
        />
        <MetricCard
          description="Successful API executions"
          icon={Activity}
          title="Success rate"
          value={formatPercent(data.overview.successRate)}
        />
        <MetricCard
          description="Tokens seen in SQLite logs"
          icon={Cpu}
          title="Total tokens"
          value={formatNumber(data.overview.totalTokens)}
        />
        <MetricCard
          description="Across all recorded requests"
          icon={Clock3}
          title="Average latency"
          value={`${formatNumber(data.overview.averageLatencyMs)} ms`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ModelDistributionCard requestModels={data.requestModels} />
        <UsageCard usage={data.usage} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <ModelBreakdownCard requestModels={data.requestModels} />
        <RecentRequestsCard recentRequests={data.recentRequests} />
      </div>
    </div>
  )
}
