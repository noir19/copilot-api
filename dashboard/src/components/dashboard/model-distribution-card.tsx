import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { ModelBreakdownRow } from "../../lib/dashboard-api"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"

export function ModelDistributionCard({
  requestModels,
}: {
  requestModels: Array<ModelBreakdownRow>
}) {
  const chartData = requestModels.slice(0, 6).map((item) => ({
    name: item.modelDisplay ?? item.modelRaw ?? "未知模型",
    requests: item.requestCount,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>模型分布</CardTitle>
        <CardDescription>
          先按展示映射聚合，其次回退到原始模型名。
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            还没有请求数据。
          </div>
        ) : (
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis
                angle={-12}
                axisLine={false}
                dataKey="name"
                height={72}
                interval={0}
                textAnchor="end"
                tickLine={false}
              />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="requests" fill="#0f172a" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
