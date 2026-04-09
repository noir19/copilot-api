import { useCallback, useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { loadTimeSeries, type TimeSeriesPoint } from "../../lib/dashboard-api"
import { formatNumber } from "../../lib/format"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"

type TrendMetric = "requests" | "tokens" | "errors"
type Granularity = "hour" | "day"

const METRIC_CONFIG: Record<
  TrendMetric,
  { label: string; color: string; fill: string }
> = {
  requests: { label: "请求数", color: "#6366f1", fill: "#6366f120" },
  tokens: { label: "Token", color: "#0ea5e9", fill: "#0ea5e920" },
  errors: { label: "错误数", color: "#f43f5e", fill: "#f43f5e20" },
}

const GRANULARITY_CONFIG: Record<
  Granularity,
  { label: string; bucketMinutes: number; limit: number }
> = {
  hour: { label: "小时", bucketMinutes: 60, limit: 168 },
  day: { label: "天", bucketMinutes: 1440, limit: 30 },
}

function formatHourBucket(bucket: string): string {
  const d = new Date(bucket)
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hour = String(d.getHours()).padStart(2, "0")
  return `${month}/${day} ${hour}:00`
}

function formatDayBucket(bucket: string): string {
  const d = new Date(bucket)
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${month}/${day}`
}

export function RequestTrendCard({
  initialData,
}: {
  initialData: Array<TimeSeriesPoint>
}) {
  const [metric, setMetric] = useState<TrendMetric>("requests")
  const [granularity, setGranularity] = useState<Granularity>("hour")
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)

  const config = METRIC_CONFIG[metric]
  const formatBucket =
    granularity === "hour" ? formatHourBucket : formatDayBucket

  const fetchData = useCallback(async (g: Granularity) => {
    const gc = GRANULARITY_CONFIG[g]
    setLoading(true)
    try {
      const result = await loadTimeSeries(gc.bucketMinutes, gc.limit)
      setData(result)
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (granularity === "hour") {
      setData(initialData)
    } else {
      void fetchData(granularity)
    }
  }, [granularity, initialData, fetchData])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base">请求趋势</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
              {(
                Object.entries(GRANULARITY_CONFIG) as Array<
                  [Granularity, (typeof GRANULARITY_CONFIG)[Granularity]]
                >
              ).map(([key, gc]) => (
                <Button
                  key={key}
                  onClick={() => setGranularity(key)}
                  size="sm"
                  variant={granularity === key ? "default" : "ghost"}
                >
                  {gc.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
              {(
                Object.entries(METRIC_CONFIG) as Array<
                  [TrendMetric, (typeof METRIC_CONFIG)[TrendMetric]]
                >
              ).map(([key, cfg]) => (
                <Button
                  key={key}
                  onClick={() => setMetric(key)}
                  size="sm"
                  variant={metric === key ? "default" : "ghost"}
                >
                  {cfg.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            {loading ? "加载中..." : "还没有时间序列数据。"}
          </div>
        ) : (
          <div className="relative h-[260px]">
            {loading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60">
                <span className="text-sm text-slate-500">加载中...</span>
              </div>
            ) : null}
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={data}>
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="bucket"
                  fontSize={11}
                  stroke="#94a3b8"
                  tickFormatter={formatBucket}
                  tickLine={false}
                />
                <YAxis
                  fontSize={11}
                  stroke="#94a3b8"
                  tickFormatter={(v: number) => formatNumber(v)}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid #e2e8f0",
                    fontSize: "0.8125rem",
                  }}
                  formatter={(value) => [
                    formatNumber(Number(value)),
                    config.label,
                  ]}
                  labelFormatter={(label) => formatBucket(String(label))}
                />
                <Area
                  dataKey={metric}
                  fill={config.fill}
                  fillOpacity={1}
                  stroke={config.color}
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
