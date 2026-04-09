import type { QuotaDetail } from "../../lib/dashboard-api"

import {
  formatNumber,
  formatPercent,
  resolveQuotaValue,
} from "../../lib/format"
import { cn } from "../../lib/utils"
import { Badge } from "../ui/badge"

export function QuotaCard({
  label,
  quota,
}: {
  label: string
  quota: QuotaDetail
}) {
  const barColor =
    quota.percent_remaining > 50
      ? "bg-emerald-500"
      : quota.percent_remaining > 20
        ? "bg-amber-500"
        : "bg-rose-500"

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <Badge className="bg-white text-slate-600">{quota.quota_id}</Badge>
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-950">
        {resolveQuotaValue(quota)}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{
            width: `${Math.max(0, Math.min(quota.percent_remaining, 100))}%`,
          }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>剩余 {formatPercent(quota.percent_remaining)}</span>
        <span>
          超额 {formatNumber(quota.overage_count)}
          {quota.overage_permitted ? " 可用" : " 已阻止"}
        </span>
      </div>
    </div>
  )
}
