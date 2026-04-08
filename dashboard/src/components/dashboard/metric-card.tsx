import type { LucideIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"

export function MetricCard({
  description,
  icon: Icon,
  title,
  value,
}: {
  description: string
  icon: LucideIcon
  title: string
  value: string
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardDescription>{description}</CardDescription>
          <CardTitle className="mt-2 text-sm font-medium text-slate-600">
            {title}
          </CardTitle>
        </div>
        <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight text-slate-950">
          {value}
        </div>
      </CardContent>
    </Card>
  )
}
