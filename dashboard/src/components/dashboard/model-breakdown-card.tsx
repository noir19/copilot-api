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
        <CardTitle>Model breakdown</CardTitle>
        <CardDescription>
          Latest persisted request counts by model.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requestModels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No model requests yet.
            </div>
          ) : (
            requestModels.slice(0, 8).map((item) => (
              <div
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                key={`${item.modelDisplay}-${item.modelRaw}`}
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {item.modelDisplay ?? item.modelRaw ?? "Unknown model"}
                  </p>
                  <p className="text-xs text-slate-500">
                    raw {item.modelRaw ?? "unknown"} • last{" "}
                    {formatTimestamp(item.lastRequestedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-950">
                    {formatNumber(item.requestCount)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatNumber(item.totalTokens)} tokens
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
