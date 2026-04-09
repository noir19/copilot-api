import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "../ui/card"

const ACCENT_COLORS = [
  {
    bg: "bg-violet-50",
    icon: "bg-violet-500 text-white",
    ring: "ring-violet-500/10",
  },
  {
    bg: "bg-emerald-50",
    icon: "bg-emerald-500 text-white",
    ring: "ring-emerald-500/10",
  },
  {
    bg: "bg-amber-50",
    icon: "bg-amber-500 text-white",
    ring: "ring-amber-500/10",
  },
  { bg: "bg-sky-50", icon: "bg-sky-500 text-white", ring: "ring-sky-500/10" },
] as const

export function MetricCard({
  colorIndex = 0,
  icon: Icon,
  title,
  value,
}: {
  colorIndex?: number
  icon: LucideIcon
  title: string
  value: string
}) {
  const accent = ACCENT_COLORS[colorIndex % ACCENT_COLORS.length]

  return (
    <Card className={`ring-1 ${accent.ring}`}>
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div className={`rounded-lg p-2 ${accent.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  )
}
