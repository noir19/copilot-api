import { useCallback, useEffect, useMemo, useState } from "react"
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
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { Input } from "../ui/input"

type TrendMetric = "requests" | "inputTokens" | "outputTokens" | "errors"
type Granularity = "day" | "week" | "month" | "year"
type WindowMode = "rolling" | "calendar"
type NaturalPeriodValues = {
  day: string
  month: string
  week: string
  year: string
}

const METRIC_CONFIG: Record<TrendMetric, { label: string; color: string }> = {
  requests: { label: "请求数", color: "#6366f1" },
  inputTokens: { label: "Input Token", color: "#0ea5e9" },
  outputTokens: { label: "Output Token", color: "#14b8a6" },
  errors: { label: "错误数", color: "#f43f5e" },
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

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function toMonthInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function getIsoWeek(date: Date): { week: number; year: number } {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const weekYear = d.getFullYear()
  const week1 = new Date(weekYear, 0, 4)
  const week =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  return { week, year: weekYear }
}

function toWeekInputValue(date: Date): string {
  const { week, year } = getIsoWeek(date)
  return `${year}-W${String(week).padStart(2, "0")}`
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

function parseWeekInput(value: string): Date {
  const [yearPart, weekPart] = value.split("-W")
  const year = Number(yearPart)
  const week = Number(weekPart)
  const jan4 = new Date(year, 0, 4)
  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  week1Monday.setHours(0, 0, 0, 0)

  const start = new Date(week1Monday)
  start.setDate(week1Monday.getDate() + (week - 1) * 7)
  return start
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
}

function getNaturalPeriodRange(
  granularity: Granularity,
  values: NaturalPeriodValues,
): { limit: number; timeFrom: string; timeTo: string } {
  switch (granularity) {
    case "day": {
      const start = parseDateInput(values.day)
      const end = new Date(start)
      end.setDate(start.getDate() + 1)
      return {
        limit: 24,
        timeFrom: start.toISOString(),
        timeTo: end.toISOString(),
      }
    }
    case "week": {
      const start = parseWeekInput(values.week)
      const end = new Date(start)
      end.setDate(start.getDate() + 7)
      return {
        limit: 7,
        timeFrom: start.toISOString(),
        timeTo: end.toISOString(),
      }
    }
    case "month": {
      const [year, month] = values.month.split("-").map(Number)
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
      const end = new Date(year, month, 1, 0, 0, 0, 0)
      return {
        limit: daysBetween(start, end),
        timeFrom: start.toISOString(),
        timeTo: end.toISOString(),
      }
    }
    case "year": {
      const year = Number(values.year)
      const start = new Date(year, 0, 1, 0, 0, 0, 0)
      const end = new Date(year + 1, 0, 1, 0, 0, 0, 0)
      return {
        limit: 12,
        timeFrom: start.toISOString(),
        timeTo: end.toISOString(),
      }
    }
  }
}

function getNaturalPeriodHint(granularity: Granularity): string {
  switch (granularity) {
    case "day":
      return "自然日"
    case "week":
      return "周一至周日"
    case "month":
      return "自然月"
    case "year":
      return "自然年"
  }
}

export function RequestTrendCard({
  initialData,
}: {
  initialData: Array<TimeSeriesPoint>
}) {
  const [metric, setMetric] = useState<TrendMetric>("requests")
  const [granularity, setGranularity] = useState<Granularity>("day")
  const [windowMode, setWindowMode] = useState<WindowMode>("calendar")
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [naturalPeriod, setNaturalPeriod] = useState<NaturalPeriodValues>(
    () => {
      const now = new Date()
      return {
        day: toDateInputValue(now),
        month: toMonthInputValue(now),
        week: toWeekInputValue(now),
        year: String(now.getFullYear()),
      }
    },
  )

  const total = data.reduce((sum, point) => {
    return sum + point[metric]
  }, 0)
  const peakPoint = data.reduce<TimeSeriesPoint | null>((current, point) => {
    const currentValue = current?.[metric] ?? 0
    const pointValue = point[metric]

    if (!current || pointValue > currentValue) {
      return point
    }
    return current
  }, null)
  const nonZeroBuckets = data.filter((point) => point[metric] > 0).length
  const peakValue = peakPoint == null ? 0 : peakPoint[metric]

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
  const naturalRange = useMemo(
    () => getNaturalPeriodRange(granularity, naturalPeriod),
    [granularity, naturalPeriod],
  )
  const naturalHint = getNaturalPeriodHint(granularity)

  const fetchData = useCallback(
    async (
      g: Granularity,
      mode: WindowMode,
      range: { limit: number; timeFrom: string; timeTo: string },
    ) => {
      const gc = GRANULARITY_CONFIG[g]
      setLoading(true)
      try {
        if (mode === "calendar") {
          const result = await loadTimeSeries(
            gc.bucketMinutes,
            range.limit,
            range.timeFrom,
            range.timeTo,
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
    },
    [],
  )

  useEffect(() => {
    if (granularity === "day" && windowMode === "rolling") {
      setData(initialData)
    } else {
      void fetchData(granularity, windowMode, naturalRange)
    }
  }, [granularity, windowMode, initialData, naturalRange, fetchData])

  const updateNaturalPeriod = (value: string) => {
    if (!value) return

    setNaturalPeriod((current) => ({
      ...current,
      [granularity]: value,
    }))
  }

  const renderChart = (
    chartData: Array<TimeSeriesPoint>,
    bars: Array<{
      color: string
      dataKey: TrendMetric
      label: string
    }>,
    heightClassName: string,
  ) => (
    <div className={heightClassName}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart barCategoryGap={8} data={chartData}>
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
            formatter={(value, name) => {
              const label =
                typeof name === "string"
                  ? name
                  : metric === "requests"
                    ? "请求数"
                    : "错误数"
              return [formatNumber(Number(value)), label]
            }}
            labelFormatter={(label) => tooltipFormat(String(label))}
          />
          {bars.map((bar) => (
            <Bar
              dataKey={bar.dataKey}
              fill={bar.color}
              key={bar.dataKey}
              name={bar.label}
              radius={[6, 6, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="space-y-4">
          <div className="space-y-1">
            <CardTitle className="text-base">请求趋势</CardTitle>
            <CardDescription>
              按时间窗口查看请求波动、Token
              消耗和错误密度。趋势图会补齐空桶，避免把无请求时段压缩掉。
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
            {windowMode === "calendar" ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {granularity === "day" ? (
                  <Input
                    className="h-9 w-[150px]"
                    onChange={(event) =>
                      updateNaturalPeriod(event.target.value)
                    }
                    type="date"
                    value={naturalPeriod.day}
                  />
                ) : null}
                {granularity === "week" ? (
                  <Input
                    className="h-9 w-[150px]"
                    onChange={(event) =>
                      updateNaturalPeriod(event.target.value)
                    }
                    type="week"
                    value={naturalPeriod.week}
                  />
                ) : null}
                {granularity === "month" ? (
                  <Input
                    className="h-9 w-[150px]"
                    onChange={(event) =>
                      updateNaturalPeriod(event.target.value)
                    }
                    type="month"
                    value={naturalPeriod.month}
                  />
                ) : null}
                {granularity === "year" ? (
                  <Input
                    className="h-9 w-[110px]"
                    min="2000"
                    onChange={(event) =>
                      updateNaturalPeriod(event.target.value)
                    }
                    type="number"
                    value={naturalPeriod.year}
                  />
                ) : null}
                <span>{naturalHint}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
              {(
                [
                  ["requests", { label: "请求数", color: "#6366f1" }],
                  ["inputTokens", { label: "Input", color: "#0ea5e9" }],
                  ["outputTokens", { label: "Output", color: "#14b8a6" }],
                  ["errors", { label: "错误数", color: "#f43f5e" }],
                ] as const
              ).map(([key, cfg]) => (
                <button
                  key={key}
                  className={cn(
                    "rounded-md px-3 h-9 text-sm font-medium transition-colors",
                    metric === key
                      ? "text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                  onClick={() => setMetric(key)}
                  style={
                    metric === key ? { backgroundColor: cfg.color } : undefined
                  }
                  type="button"
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              当前窗口总计
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
              {formatNumber(total)}
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
              峰值数字
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
              {formatNumber(peakValue)}
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
            {renderChart(
              data,
              [
                {
                  color: METRIC_CONFIG[metric].color,
                  dataKey: metric,
                  label: METRIC_CONFIG[metric].label,
                },
              ],
              "h-[260px]",
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
