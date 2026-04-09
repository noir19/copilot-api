import { ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"

import type { ModelBreakdownRow, RecentRequestRow } from "../../lib/dashboard-api"
import { formatTimestamp } from "../../lib/format"
import { cn } from "../../lib/utils"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
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
  allModels,
}: {
  requests: Array<RecentRequestRow>
  allModels: Array<ModelBreakdownRow>
}) {
  const [filterModel, setFilterModel] = useState("")
  const [filterRoute, setFilterRoute] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [timeFrom, setTimeFrom] = useState("")
  const [timeTo, setTimeTo] = useState("")
  const [page, setPage] = useState(0)

  const modelOptions = useMemo(() => {
    const set = new Set<string>()
    for (const m of allModels) {
      if (m.modelRaw) set.add(m.modelRaw)
    }
    return Array.from(set).sort()
  }, [allModels])

  const filtered = useMemo(() => {
    const fromMs = timeFrom ? new Date(timeFrom).getTime() : 0
    const toMs = timeTo ? new Date(timeTo).getTime() : Number.MAX_SAFE_INTEGER
    return requests.filter((r) => {
      if (filterModel && r.modelRaw !== filterModel) return false
      if (filterRoute && !r.route.toLowerCase().includes(filterRoute.toLowerCase())) return false
      if (filterStatus === "success" && r.status !== "success") return false
      if (filterStatus === "error" && r.status !== "error") return false
      const ts = new Date(r.timestamp).getTime()
      if (ts < fromMs || ts > toMs) return false
      return true
    })
  }, [requests, filterModel, filterRoute, filterStatus, timeFrom, timeTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  )

  const hasFilter = filterModel || filterRoute || filterStatus || timeFrom || timeTo

  function resetFilters() {
    setFilterModel("")
    setFilterRoute("")
    setFilterStatus("")
    setTimeFrom("")
    setTimeTo("")
    setPage(0)
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] flex-col rounded-2xl border border-slate-200/70 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <select
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
          onChange={(e) => { setFilterModel(e.target.value); setPage(0) }}
          value={filterModel}
        >
          <option value="">全部模型</option>
          {modelOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <Input
          className="h-8 w-40"
          onChange={(e) => { setFilterRoute(e.target.value); setPage(0) }}
          placeholder="路由"
          value={filterRoute}
        />
        <select
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
          onChange={(e) => { setFilterStatus(e.target.value); setPage(0) }}
          value={filterStatus}
        >
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="error">失败</option>
        </select>
        <span className="mx-0.5 h-4 w-px bg-slate-200" />
        <input
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
          onChange={(e) => { setTimeFrom(e.target.value); setPage(0) }}
          type="datetime-local"
          step="1"
          value={timeFrom}
        />
        <span className="text-xs text-slate-400">至</span>
        <input
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
          onChange={(e) => { setTimeTo(e.target.value); setPage(0) }}
          type="datetime-local"
          step="1"
          value={timeTo}
        />
        {hasFilter ? (
          <Button onClick={resetFilters} size="sm" variant="ghost">
            清除筛选
          </Button>
        ) : null}
      </div>

      <TableWrapper className="flex-1 overflow-auto">
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
                  {hasFilter ? "没有匹配的日志记录。" : "还没有日志数据。"}
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

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
        <p className="text-sm text-slate-500">
          共 {filtered.length} 条{hasFilter ? "（已筛选）" : ""}
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
          <span className="text-sm tabular-nums text-slate-600">
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
    </div>
  )
}
