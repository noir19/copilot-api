import type { CopilotUsageResponse } from "../../lib/dashboard-api"

import { formatTimestamp } from "../../lib/format"
import { Badge } from "../ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { QuotaCard } from "./quota-card"

export function UsageCard({ usage }: { usage: CopilotUsageResponse }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Copilot 配额</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <Badge>{usage.copilot_plan}</Badge>
            <Badge>{usage.access_type_sku}</Badge>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          重置时间 {formatTimestamp(usage.quota_reset_date)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <QuotaCard label="对话" quota={usage.quota_snapshots.chat} />
        <QuotaCard label="补全" quota={usage.quota_snapshots.completions} />
        <QuotaCard
          label="高级交互"
          quota={usage.quota_snapshots.premium_interactions}
        />
      </CardContent>
    </Card>
  )
}
