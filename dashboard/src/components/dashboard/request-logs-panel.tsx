import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import type {
  ModelBreakdownRow,
  RecentRequestRow,
  RequestLogFilter,
} from "../../lib/dashboard-api"
import { loadRequestCount, loadRequests } from "../../lib/dashboard-api"
import { formatNumber, formatTimestamp, formatUsd } from "../../lib/format"
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
const EMPTY_FILTER: RequestLogFilter = {}

export function RequestLogsPanel({
  allModels,
}: {
  allModels: Array<ModelBreakdownRow>
}) {
  const [filterModel, setFilterModel] = useState("")
  const [filterRoute, setFilterRoute] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [timeFrom, setTimeFrom] = useState("")
  const [timeTo, setTimeTo] = useState("")
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState<Array<RecentRequestRow>>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [committedFilter, setCommittedFilter] =
    useState<RequestLogFilter>(EMPTY_FILTER)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  const modelOptions = useMemo(() => {
    const set = new Set<string>()
    for (const m of allModels) {
      if (m.modelRaw) set.add(m.modelRaw)
    }
    return Array.from(set).sort()
  }, [allModels])

  // Per-model cost-per-token derived from model breakdown aggregate data
  const costPerToken = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of allModels) {
      if (
        m.modelRaw &&
        m.openRouterEstimatedCostUsd != null &&
        m.totalTokens > 0
      ) {
        map.set(m.modelRaw, m.openRouterEstimatedCostUsd / m.totalTokens)
      }
    }
    return map
  }, [allModels])

  function estimateCost(request: RecentRequestRow): number | null {
    const rate = request.modelRaw
      ? costPerToken.get(request.modelRaw)
      : undefined
    if (rate == null) return null
    const tokens = (request.inputTokens ?? 0) + (request.outputTokens ?? 0)
    if (tokens === 0) return null
    return tokens * rate
  }

  const commitFilter = useCallback(() => {
    const f: RequestLogFilter = {}
    if (filterModel) f.model = filterModel
    if (filterRoute) f.route = filterRoute
    if (filterStatus === "success" || filterStatus === "error")
      f.status = filterStatus
    if (timeFrom) f.timeFrom = timeFrom
    if (timeTo) f.timeTo = timeTo
    setCommittedFilter(f)
    setPage(0)
  }, [filterModel, filterRoute, filterStatus, timeFrom, timeTo])

  // Fetch rows for current page
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadRequests(page, PAGE_SIZE, committedFilter)
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, committedFilter])

  // Fetch total count independently (only on filter change)
  useEffect(() => {
    let cancelled = false
    setTotal(-1)
    loadRequestCount(committedFilter)
      .then((count) => {
        if (!cancelled) setTotal(count)
      })
      .catch(() => {
        if (!cancelled) setTotal(-2)
      })
    return () => {
      cancelled = true
    }
  }, [committedFilter])

  useEffect(() => {
    if (!errorDetail) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setErrorDetail(null)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [errorDetail])

  const countLoaded = total >= 0
  const countFailed = total === -2
  const totalPages = countLoaded ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 0
  const safePage = countLoaded ? Math.min(page, totalPages - 1) : page

  const hasFilter =
    filterModel || filterRoute || filterStatus || timeFrom || timeTo

  function resetFilters() {
    setFilterModel("")
    setFilterRoute("")
    setFilterStatus("")
    setTimeFrom("")
    setTimeTo("")
    setCommittedFilter(EMPTY_FILTER)
    setPage(0)
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] flex-col rounded-2xl border border-slate-200/70 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <select
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
          onChange={(e) => setFilterModel(e.target.value)}
          value={filterModel}
        >
          <option value="">全部模型</option>
          {modelOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <Input
          className="h-8 w-40"
          onChange={(e) => setFilterRoute(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commitFilter()}
          placeholder="路由"
          value={filterRoute}
        />
        <select
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
          onChange={(e) => setFilterStatus(e.target.value)}
          value={filterStatus}
        >
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="error">失败</option>
        </select>
        <span className="mx-0.5 h-4 w-px bg-slate-200" />
        <input
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
          onChange={(e) => setTimeFrom(e.target.value)}
          type="datetime-local"
          step="1"
          value={timeFrom}
        />
        <span className="text-xs text-slate-400">至</span>
        <input
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
          onChange={(e) => setTimeTo(e.target.value)}
          type="datetime-local"
          step="1"
          value={timeTo}
        />
        <Button onClick={commitFilter} size="sm">
          <Search className="mr-1.5 h-3.5 w-3.5" />
          查询
        </Button>
        {hasFilter ? (
          <Button onClick={resetFilters} size="sm" variant="ghost">
            清除筛选
          </Button>
        ) : null}
      </div>

      <TableWrapper className="relative flex-1 overflow-auto">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <span className="text-sm text-slate-500">加载中...</span>
          </div>
        ) : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>请求模型</TableHead>
              <TableHead>目标模型</TableHead>
              <TableHead>路由</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">延迟</TableHead>
              <TableHead className="text-right">总 Token</TableHead>
              <TableHead className="text-right">估价</TableHead>
              <TableHead>错误</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && !loading ? (
              <TableRow>
                <TableCell className="py-6 text-slate-500" colSpan={9}>
                  {hasFilter ? "没有匹配的日志记录。" : "还没有日志数据。"}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{formatTimestamp(request.timestamp)}</TableCell>
                  <TableCell>
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {request.modelDisplay ?? "未知"}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {request.modelRaw ?? "未知"}
                    </code>
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
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(request.latencyMs ?? 0)} ms
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(request.totalTokens ?? 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(() => {
                      const cost = estimateCost(request)
                      return cost != null ? formatUsd(cost) : "-"
                    })()}
                  </TableCell>
                  <TableCell>
                    {request.errorMessage ? (
                      <button
                        className="max-w-[120px] truncate text-xs text-rose-600 underline decoration-rose-300 hover:text-rose-700"
                        onClick={() => setErrorDetail(request.errorMessage)}
                        type="button"
                      >
                        {request.errorMessage}
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableWrapper>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
        <p className="text-sm text-slate-500">
          {countLoaded ? (
            <>
              共 {total} 条{hasFilter ? "（已筛选）" : ""}
            </>
          ) : countFailed ? (
            "统计失败"
          ) : (
            "统计中..."
          )}
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
            {safePage + 1}
            {countLoaded ? ` / ${totalPages}` : ""}
          </span>
          <Button
            disabled={
              countLoaded ? safePage >= totalPages - 1 : rows.length < PAGE_SIZE
            }
            onClick={() => setPage(page + 1)}
            size="sm"
            variant="outline"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {errorDetail ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setErrorDetail(null)}
          onKeyDown={() => {}}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="mx-4 max-h-[70vh] w-full max-w-lg overflow-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
            role="document"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">错误详情</h3>
              <button
                className="text-sm text-slate-400 hover:text-slate-600"
                onClick={() => setErrorDetail(null)}
                type="button"
              >
                关闭
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
              {errorDetail}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  )
}
