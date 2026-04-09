import { useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import type { ModelBreakdownRow } from "../../lib/dashboard-api"

import { formatNumber, formatUsd } from "../../lib/format"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"

type DistributionMetric = "requests" | "tokens" | "cost"
type DistributionView = "bar" | "donut" | "list"

const CHART_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#8b5cf6",
]

function normalizeModelLabel(value: string | null): string {
  return value?.trim().toLowerCase() || "未知模型"
}

export function ModelDistributionCard({
  requestModels,
}: {
  requestModels: Array<ModelBreakdownRow>
}) {
  const [view, setView] = useState<DistributionView>("bar")
  const [metric, setMetric] = useState<DistributionMetric>("requests")

  const chartData = Array.from(
    requestModels
      .reduce<
        Map<
          string,
          {
            label: string
            cost: number
            costStatus: "missing" | "ready"
            openRouterModelId: string | null
            requests: number
            tokens: number
          }
        >
      >((map, item) => {
        const label = normalizeModelLabel(item.modelRaw ?? item.modelDisplay)
        const existing = map.get(label)
        const nextCost = item.openRouterEstimatedCostUsd ?? 0
        const nextCostStatus =
          item.openRouterEstimatedCostUsd === null ? "missing" : "ready"

        if (existing) {
          existing.cost += nextCost
          existing.costStatus =
            existing.costStatus === "ready" || nextCostStatus === "ready"
              ? "ready"
              : "missing"
          existing.openRouterModelId ??= item.openRouterModelId
          existing.requests += item.requestCount
          existing.tokens += item.totalTokens
          return map
        }

        map.set(label, {
          label,
          cost: nextCost,
          costStatus: nextCostStatus,
          openRouterModelId: item.openRouterModelId,
          requests: item.requestCount,
          tokens: item.totalTokens,
        })
        return map
      }, new Map())
      .values(),
  )
    .sort((a, b) => b.requests - a.requests || b.tokens - a.tokens)
    .slice(0, 6)

  const metricLabel =
    metric === "requests" ? "请求数" : metric === "tokens" ? "Token" : "估价"
  const totalValue = chartData.reduce((sum, item) => sum + item[metric], 0)

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base">模型分布</CardTitle>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
              <Button
                onClick={() => setMetric("requests")}
                size="sm"
                variant={metric === "requests" ? "default" : "ghost"}
              >
                请求数
              </Button>
              <Button
                onClick={() => setMetric("tokens")}
                size="sm"
                variant={metric === "tokens" ? "default" : "ghost"}
              >
                Token
              </Button>
              <Button
                onClick={() => setMetric("cost")}
                size="sm"
                variant={metric === "cost" ? "default" : "ghost"}
              >
                费用
              </Button>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
              <Button
                onClick={() => setView("bar")}
                size="sm"
                variant={view === "bar" ? "default" : "ghost"}
              >
                图表
              </Button>
              <Button
                onClick={() => setView("donut")}
                size="sm"
                variant={view === "donut" ? "default" : "ghost"}
              >
                环形
              </Button>
              <Button
                onClick={() => setView("list")}
                size="sm"
                variant={view === "list" ? "default" : "ghost"}
              >
                明细
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-semibold tabular-nums text-slate-950">
            {metric === "cost"
              ? `${metricLabel} ${formatUsd(totalValue)}`
              : `${metricLabel} ${formatNumber(totalValue)}`}
          </p>
          <p className="text-slate-500">Top {chartData.length} 模型</p>
        </div>
        {chartData.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            还没有请求数据。
          </div>
        ) : view === "bar" ? (
          <div className="space-y-3">
            {chartData.map((item, index) => {
              const value = item[metric]
              const maxValue = Math.max(...chartData.map((d) => d[metric]))
              const pct = maxValue === 0 ? 0 : (value / maxValue) * 100

              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      <span className="font-medium text-slate-800">
                        {item.label}
                      </span>
                    </div>
                    <span className="tabular-nums text-slate-600">
                      {metric === "cost"
                        ? formatUsd(value)
                        : formatNumber(value)}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              )
            })}
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
                      {metric === "cost"
                        ? formatUsd(value)
                        : formatNumber(value)}
                    </p>
                    {metric === "cost" ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {item.costStatus === "ready"
                          ? `按 ${item.openRouterModelId ?? item.label} 官方价估算`
                          : "暂未匹配到 OpenRouter 价格"}
                      </p>
                    ) : null}
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
                        {metric === "cost"
                          ? formatUsd(value)
                          : formatNumber(value)}
                      </p>
                      <p className="text-sm text-slate-500">
                        占比 {share.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {metric === "cost" ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {item.costStatus === "ready"
                        ? `按 ${item.openRouterModelId ?? item.label} 官方价估算`
                        : "暂未匹配到 OpenRouter 价格"}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
