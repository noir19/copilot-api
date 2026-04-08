import type { CopilotUsageResponse } from "../../lib/dashboard-api"

import { formatTimestamp } from "../../lib/format"
import { Badge } from "../ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { QuotaCard } from "./quota-card"

export function UsageCard({ usage }: { usage: CopilotUsageResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Copilot 配额</CardTitle>
        <CardDescription>
          直接读取 GitHub Copilot 账户接口返回的实时配额。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>{usage.copilot_plan}</Badge>
          <Badge>{usage.access_type_sku}</Badge>
          <Badge>重置时间 {formatTimestamp(usage.quota_reset_date)}</Badge>
        </div>
        <div className="grid gap-4">
          <QuotaCard label="对话" quota={usage.quota_snapshots.chat} />
          <QuotaCard label="补全" quota={usage.quota_snapshots.completions} />
          <QuotaCard
            label="高级交互"
            quota={usage.quota_snapshots.premium_interactions}
          />
        </div>
      </CardContent>
    </Card>
  )
}
