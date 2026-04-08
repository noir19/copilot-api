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

export function RequestLogsPanel({
  requests,
}: {
  requests: Array<RecentRequestRow>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>请求日志</CardTitle>
        <CardDescription>
          这里展示已经异步写入 SQLite 的请求日志，便于排查模型、错误和延迟问题。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TableWrapper className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>请求模型</TableHead>
                <TableHead>展示模型</TableHead>
                <TableHead>路由</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>延迟</TableHead>
                <TableHead>总 Token</TableHead>
                <TableHead>流式</TableHead>
                <TableHead>账号类型</TableHead>
                <TableHead>错误信息</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell className="py-6 text-slate-500" colSpan={10}>
                    还没有日志数据。
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{formatTimestamp(request.timestamp)}</TableCell>
                    <TableCell>
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {request.modelRaw ?? "未知"}
                      </code>
                    </TableCell>
                    <TableCell>
                      {request.modelDisplay ?? request.modelRaw ?? "未知"}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {request.route}
                      </code>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>{request.latencyMs ?? 0} ms</TableCell>
                    <TableCell>{request.totalTokens ?? 0}</TableCell>
                    <TableCell>{request.stream ? "是" : "否"}</TableCell>
                    <TableCell>{request.accountType}</TableCell>
                    <TableCell className="max-w-[260px] whitespace-normal break-words text-xs text-slate-600">
                      {request.errorMessage ?? "-"}
                    </TableCell>
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
