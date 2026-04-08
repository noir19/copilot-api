import type { ModelBreakdownRow } from "../../lib/dashboard-api"

import { formatNumber, formatTimestamp } from "../../lib/format"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"

export function ModelBreakdownCard({
  requestModels,
}: {
  requestModels: Array<ModelBreakdownRow>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>模型明细</CardTitle>
        <CardDescription>按模型汇总最近落库的请求统计。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requestModels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              还没有模型请求数据。
            </div>
          ) : (
            requestModels.slice(0, 8).map((item) => (
              <div
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                key={`${item.modelDisplay}-${item.modelRaw}`}
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {item.modelDisplay ?? item.modelRaw ?? "未知模型"}
                  </p>
                  <p className="text-xs text-slate-500">
                    原始值 {item.modelRaw ?? "未知"} • 最近请求{" "}
                    {formatTimestamp(item.lastRequestedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-950">
                    {formatNumber(item.requestCount)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatNumber(item.totalTokens)} Token
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
