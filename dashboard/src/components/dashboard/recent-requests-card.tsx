import type { RecentRequestRow } from "../../lib/dashboard-api"

import { formatTimestamp } from "../../lib/format"
import { cn } from "../../lib/utils"
import { Badge } from "../ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "../ui/table"

export function RecentRequestsCard({
  recentRequests,
}: {
  recentRequests: Array<RecentRequestRow>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>最近请求</CardTitle>
        <CardDescription>
          首页只展示最近几条已落库请求，完整日志请切到“日志”页。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>模型</TableHead>
                <TableHead>路由</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>延迟</TableHead>
                <TableHead>Token</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRequests.length === 0 ? (
                <TableRow>
                  <TableCell className="py-6 text-slate-500" colSpan={6}>
                    还没有最近请求。
                  </TableCell>
                </TableRow>
              ) : (
                recentRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{formatTimestamp(request.timestamp)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">
                          {request.modelDisplay ?? request.modelRaw ?? "未知"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {request.modelRaw ?? "未知原始值"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {request.route}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          className={cn(
                            request.status === "success"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700",
                          )}
                        >
                          {request.status === "success" ? "成功" : "失败"}{" "}
                          {request.statusCode}
                        </Badge>
                        {request.errorMessage ? (
                          <div className="max-w-[220px] text-xs text-rose-600">
                            {request.errorMessage}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{request.latencyMs ?? 0} ms</TableCell>
                    <TableCell>{request.totalTokens ?? 0}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrapper>
      </CardContent>
    </Card>
  )
}
