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
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <Badge className="bg-white px-1.5 py-0 text-[10px] text-slate-500">
            {quota.quota_id}
          </Badge>
        </div>
        <p className="text-sm font-semibold tabular-nums text-slate-950">
          {resolveQuotaValue(quota)}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor,
          )}
          style={{
            width: `${Math.max(0, Math.min(quota.percent_remaining, 100))}%`,
          }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
        <span>剩余 {formatPercent(quota.percent_remaining)}</span>
        <span>
          超额 {formatNumber(quota.overage_count)}
          {quota.overage_permitted ? " 可用" : " 已阻止"}
        </span>
      </div>
    </div>
  )
}
