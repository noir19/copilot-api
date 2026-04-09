import type { CopilotUsageResponse } from "../../lib/dashboard-api"

import {
  formatNumber,
  formatTimestamp,
  resolveQuotaValue,
} from "../../lib/format"
import { Badge } from "../ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { QuotaCard } from "./quota-card"

function summaryItems(usage: CopilotUsageResponse) {
  return [
    {
      label: "对话",
      quota: usage.quota_snapshots.chat,
    },
    {
      label: "补全",
      quota: usage.quota_snapshots.completions,
    },
    {
      label: "高级交互",
      quota: usage.quota_snapshots.premium_interactions,
    },
  ]
}

export function UsageCard({ usage }: { usage: CopilotUsageResponse }) {
  const items = summaryItems(usage)

  return (
    <Card className="h-full">
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
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div className="rounded-2xl bg-slate-50 px-4 py-3" key={item.label}>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                {resolveQuotaValue(item.quota)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                超额 {formatNumber(item.quota.overage_count)}
                {item.quota.overage_permitted ? " 可用" : " 已阻止"}
              </p>
            </div>
          ))}
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
