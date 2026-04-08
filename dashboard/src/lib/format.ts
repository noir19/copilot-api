import type { QuotaDetail } from "./dashboard-api"

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatTimestamp(value: string | null): string {
  if (!value) {
    return "从未"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function resolveQuotaValue(quota: QuotaDetail): string {
  if (quota.unlimited) {
    return "无限制"
  }

  return `剩余 ${formatNumber(quota.remaining)}`
}
