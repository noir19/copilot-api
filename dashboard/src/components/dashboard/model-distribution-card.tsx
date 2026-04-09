import { useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { ModelBreakdownRow } from "../../lib/dashboard-api"

import { formatNumber } from "../../lib/format"
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"

type DistributionMetric = "requests" | "tokens"
type DistributionView = "bar" | "donut" | "list"

const CHART_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#8b5cf6",
]

export function ModelDistributionCard({
  requestModels,
}: {
  requestModels: Array<ModelBreakdownRow>
}) {
  const [view, setView] = useState<DistributionView>("bar")
  const [metric, setMetric] = useState<DistributionMetric>("requests")

  const chartData = requestModels.slice(0, 6).map((item) => ({
    label: item.modelDisplay ?? item.modelRaw ?? "未知模型",
    requests: item.requestCount,
    tokens: item.totalTokens,
  }))

  const metricLabel = metric === "requests" ? "请求数" : "Token"
  const totalValue = chartData.reduce((sum, item) => sum + item[metric], 0)

  const barChartHeight = Math.max(180, chartData.length * 56 + 40)

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle>模型分布</CardTitle>
            <CardDescription>
              默认以横向柱状图查看模型调用量，也可以切换成占比视图或明细列表。
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setMetric("requests")}
                size="sm"
                variant={metric === "requests" ? "default" : "outline"}
              >
                请求数
              </Button>
              <Button
                onClick={() => setMetric("tokens")}
                size="sm"
                variant={metric === "tokens" ? "default" : "outline"}
              >
                Token
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setView("bar")}
                size="sm"
                variant={view === "bar" ? "default" : "outline"}
              >
                柱状图
              </Button>
              <Button
                onClick={() => setView("donut")}
                size="sm"
                variant={view === "donut" ? "default" : "outline"}
              >
                环形图
              </Button>
              <Button
                onClick={() => setView("list")}
                size="sm"
                variant={view === "list" ? "default" : "outline"}
              >
                明细表
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              当前口径
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              {formatNumber(totalValue)}
            </p>
          </div>
          <p className="text-sm text-slate-600">
            Top {chartData.length} 模型，按{metricLabel}排序
          </p>
        </div>
        {chartData.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            还没有请求数据。
          </div>
        ) : view === "bar" ? (
          <div
            className="rounded-2xl border border-slate-100 bg-white"
            style={{ height: barChartHeight }}
          >
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                barSize={24}
                barCategoryGap={12}
                data={chartData}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 12, bottom: 12 }}
              >
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis
                  axisLine={false}
                  domain={[0, "dataMax"]}
                  tick={false}
                  tickLine={false}
                  type="number"
                />
                <YAxis
                  axisLine={false}
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  type="category"
                  width={150}
                />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey={metric} fill="#6366f1" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : view === "donut" ? (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="h-[280px]">
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={chartData}
                    dataKey={metric}
                    innerRadius={72}
                    outerRadius={110}
                    nameKey="label"
                    paddingAngle={2}
                  >
                    {chartData.map((item, index) => (
                      <Cell
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        key={item.label}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="max-h-[280px] space-y-3 overflow-y-auto">
              {chartData.map((item, index) => {
                const value = item[metric]
                const share = totalValue === 0 ? 0 : (value / totalValue) * 100

                return (
                  <div
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    key={item.label}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                        <span className="text-sm font-medium text-slate-800">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-sm text-slate-500">
                        {share.toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatNumber(value)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="max-h-[400px] space-y-3 overflow-y-auto">
            {chartData.map((item, index) => {
              const value = item[metric]
              const share = totalValue === 0 ? 0 : (value / totalValue) * 100

              return (
                <div
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                  key={item.label}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      <p className="font-medium text-slate-900">{item.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-950">
                        {formatNumber(value)}
                      </p>
                      <p className="text-sm text-slate-500">
                        占比 {share.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
