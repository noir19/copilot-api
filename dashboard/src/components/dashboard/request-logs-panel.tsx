import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { useMemo, useState } from "react"

import type { RecentRequestRow } from "../../lib/dashboard-api"
import { formatTimestamp } from "../../lib/format"
import { cn } from "../../lib/utils"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
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

const PAGE_SIZE = 20

export function RequestLogsPanel({
  requests,
}: {
  requests: Array<RecentRequestRow>
}) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!search.trim()) return requests
    const q = search.trim().toLowerCase()
    return requests.filter(
      (r) =>
        (r.modelRaw ?? "").toLowerCase().includes(q) ||
        (r.modelDisplay ?? "").toLowerCase().includes(q) ||
        r.route.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        String(r.statusCode).includes(q) ||
        (r.errorMessage ?? "").toLowerCase().includes(q) ||
        r.accountType.toLowerCase().includes(q),
    )
  }, [requests, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(0)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle>请求日志</CardTitle>
            <CardDescription>
              已异步写入 SQLite 的请求日志，便于排查模型、错误和延迟问题。
            </CardDescription>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="搜索模型、路由、状态..."
              value={search}
            />
          </div>
        </div>
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
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell className="py-6 text-slate-500" colSpan={10}>
                    {search ? "没有匹配的日志记录。" : "还没有日志数据。"}
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((request) => (
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

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            共 {filtered.length} 条{search ? "（已筛选）" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              size="sm"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
              size="sm"
              variant="outline"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
