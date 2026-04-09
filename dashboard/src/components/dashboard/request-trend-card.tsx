import { useCallback, useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { loadTimeSeries, type TimeSeriesPoint } from "../../lib/dashboard-api"
import { formatCompactNumber, formatNumber } from "../../lib/format"
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"

type TrendMetric = "requests" | "tokens" | "errors"
type Granularity = "day" | "week" | "month" | "year"
type WindowMode = "rolling" | "calendar"

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
  day: { label: "日", bucketMinutes: 60, limit: 24 },
  week: { label: "周", bucketMinutes: 1440, limit: 7 },
  month: { label: "月", bucketMinutes: 1440, limit: 30 },
  year: { label: "年", bucketMinutes: 43200, limit: 12 },
}

function formatHourOnly(bucket: string): string {
  const d = new Date(bucket)
  return `${String(d.getHours()).padStart(2, "0")}:00`
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

function formatMonthBucket(bucket: string): string {
  const d = new Date(bucket)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`
}

/** Get the start of the current calendar period as ISO string */
function getCalendarStart(granularity: Granularity): string {
  const now = new Date()
  switch (granularity) {
    case "day":
      now.setHours(0, 0, 0, 0)
      return now.toISOString()
    case "week": {
      const dayOfWeek = now.getDay()
      // Monday = 1, shift Sunday (0) to 7
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      now.setDate(now.getDate() - diff)
      now.setHours(0, 0, 0, 0)
      return now.toISOString()
    }
    case "month":
      now.setDate(1)
      now.setHours(0, 0, 0, 0)
      return now.toISOString()
    case "year":
      now.setMonth(0, 1)
      now.setHours(0, 0, 0, 0)
      return now.toISOString()
  }
}

/** Max number of buckets for a calendar window */
function getCalendarLimit(granularity: Granularity): number {
  const now = new Date()
  switch (granularity) {
    case "day":
      return now.getHours() + 1
    case "week": {
      const dayOfWeek = now.getDay()
      return dayOfWeek === 0 ? 7 : dayOfWeek
    }
    case "month":
      return now.getDate()
    case "year":
      return now.getMonth() + 1
  }
}

export function RequestTrendCard({
  initialData,
}: {
  initialData: Array<TimeSeriesPoint>
}) {
  const [metric, setMetric] = useState<TrendMetric>("requests")
  const [granularity, setGranularity] = useState<Granularity>("day")
  const [windowMode, setWindowMode] = useState<WindowMode>("rolling")
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)

  const config = METRIC_CONFIG[metric]
  const total = data.reduce((sum, point) => sum + point[metric], 0)
  const peakPoint = data.reduce<TimeSeriesPoint | null>((current, point) => {
    if (!current || point[metric] > current[metric]) {
      return point
    }
    return current
  }, null)
  const nonZeroBuckets = data.filter((point) => point[metric] > 0).length

  const formatBucketLabel: Record<Granularity, (b: string) => string> = {
    day: formatHourOnly,
    week: formatDayBucket,
    month: formatDayBucket,
    year: formatMonthBucket,
  }

  const formatBucketTooltip: Record<Granularity, (b: string) => string> = {
    day: formatHourBucket,
    week: formatDayBucket,
    month: formatDayBucket,
    year: formatMonthBucket,
  }

  const tickFormat = formatBucketLabel[granularity]
  const tooltipFormat = formatBucketTooltip[granularity]

  const fetchData = useCallback(async (g: Granularity, mode: WindowMode) => {
    const gc = GRANULARITY_CONFIG[g]
    setLoading(true)
    try {
      if (mode === "calendar") {
        const timeFrom = getCalendarStart(g)
        const limit = getCalendarLimit(g)
        const result = await loadTimeSeries(
          gc.bucketMinutes,
          Math.max(limit, 1),
          timeFrom,
        )
        setData(result)
      } else {
        const result = await loadTimeSeries(gc.bucketMinutes, gc.limit)
        setData(result)
      }
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (granularity === "day" && windowMode === "rolling") {
      setData(initialData)
    } else {
      void fetchData(granularity, windowMode)
    }
  }, [granularity, windowMode, initialData, fetchData])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">请求趋势</CardTitle>
            <CardDescription>
              按时间窗口查看请求波动、Token
              消耗和错误密度。趋势图会补齐空桶，避免把无请求时段压缩掉。
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                <Button
                  onClick={() => setWindowMode("rolling")}
                  size="sm"
                  variant={windowMode === "rolling" ? "default" : "ghost"}
                >
                  滚动
                </Button>
                <Button
                  onClick={() => setWindowMode("calendar")}
                  size="sm"
                  variant={windowMode === "calendar" ? "default" : "ghost"}
                >
                  自然
                </Button>
              </div>
              <span className="h-4 w-px bg-slate-300" />
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
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 self-start">
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
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              当前窗口总计
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
              {formatCompactNumber(total)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              峰值桶
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {peakPoint ? tooltipFormat(peakPoint.bucket) : "暂无"}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              有效桶
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-950">
              {formatNumber(nonZeroBuckets)}
            </p>
          </div>
        </div>
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
              <BarChart barCategoryGap={8} data={data}>
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="bucket"
                  fontSize={11}
                  stroke="#94a3b8"
                  tickFormatter={tickFormat}
                  tickLine={false}
                />
                <YAxis
                  fontSize={11}
                  stroke="#94a3b8"
                  tickFormatter={(v: number) => formatCompactNumber(v)}
                  tickLine={false}
                  width={45}
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
                  labelFormatter={(label) => tooltipFormat(String(label))}
                />
                <Bar
                  dataKey={metric}
                  fill={config.color}
                  stroke={config.color}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
