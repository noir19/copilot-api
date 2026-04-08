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
        <CardTitle>Recent requests</CardTitle>
        <CardDescription>
          Most recent persisted API calls from SQLite.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRequests.length === 0 ?
                <TableRow>
                  <TableCell className="py-6 text-slate-500" colSpan={6}>
                    No recent requests yet.
                  </TableCell>
                </TableRow>
              : recentRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{formatTimestamp(request.timestamp)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">
                          {request.modelDisplay
                            ?? request.modelRaw
                            ?? "Unknown"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {request.modelRaw ?? "unknown raw"}
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
                            request.status === "success" ?
                              "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700",
                          )}
                        >
                          {request.status} {request.statusCode}
                        </Badge>
                        {request.errorMessage ?
                          <div className="max-w-[220px] text-xs text-rose-600">
                            {request.errorMessage}
                          </div>
                        : null}
                      </div>
                    </TableCell>
                    <TableCell>{request.latencyMs ?? 0} ms</TableCell>
                    <TableCell>{request.totalTokens ?? 0}</TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableWrapper>
      </CardContent>
    </Card>
  )
}
