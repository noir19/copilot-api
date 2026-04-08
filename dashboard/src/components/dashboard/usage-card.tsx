import type { CopilotUsageResponse } from "../../lib/dashboard-api"

import { formatTimestamp } from "../../lib/format"
import { Badge } from "../ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { QuotaCard } from "./quota-card"

export function UsageCard({ usage }: { usage: CopilotUsageResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Copilot usage</CardTitle>
        <CardDescription>
          Real quota data from the GitHub Copilot account endpoint.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>{usage.copilot_plan}</Badge>
          <Badge>{usage.access_type_sku}</Badge>
          <Badge>resets {formatTimestamp(usage.quota_reset_date)}</Badge>
        </div>
        <div className="grid gap-4">
          <QuotaCard label="Chat" quota={usage.quota_snapshots.chat} />
          <QuotaCard
            label="Completions"
            quota={usage.quota_snapshots.completions}
          />
          <QuotaCard
            label="Premium interactions"
            quota={usage.quota_snapshots.premium_interactions}
          />
        </div>
      </CardContent>
    </Card>
  )
}
