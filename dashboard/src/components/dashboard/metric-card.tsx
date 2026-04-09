import type { LucideIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"

const ACCENT_COLORS = [
  { bg: "bg-violet-50", icon: "bg-violet-500 text-white", ring: "ring-violet-500/10" },
  { bg: "bg-emerald-50", icon: "bg-emerald-500 text-white", ring: "ring-emerald-500/10" },
  { bg: "bg-amber-50", icon: "bg-amber-500 text-white", ring: "ring-amber-500/10" },
  { bg: "bg-sky-50", icon: "bg-sky-500 text-white", ring: "ring-sky-500/10" },
] as const

export function MetricCard({
  colorIndex = 0,
  description,
  icon: Icon,
  title,
  value,
}: {
  colorIndex?: number
  description: string
  icon: LucideIcon
  title: string
  value: string
}) {
  const accent = ACCENT_COLORS[colorIndex % ACCENT_COLORS.length]

  return (
    <Card className={`ring-1 ${accent.ring}`}>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardDescription>{description}</CardDescription>
          <CardTitle className="mt-2 text-sm font-medium text-slate-600">
            {title}
          </CardTitle>
        </div>
        <div className={`rounded-xl p-2 shadow-sm ${accent.icon}`}>
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
