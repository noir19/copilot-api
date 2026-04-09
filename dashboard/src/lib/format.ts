import type { QuotaDetail } from "./dashboard-api"

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value)
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatUsd(value: number): string {
  if (value === 0) {
    return "$0.00"
  }

  if (value < 0.0001) {
    return "<$0.0001"
  }

  if (value < 1) {
    return `$${value.toFixed(4)}`
  }

  return `$${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`
}

export function formatTimestamp(value: string | null): string {
  if (!value) {
    return "从未"
  }

  const d = new Date(value)
  const date = new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
  }).format(d)
  const h = String(d.getHours()).padStart(2, "0")
  const m = String(d.getMinutes()).padStart(2, "0")
  return `${date} ${h}:${m}`
}

export function resolveQuotaValue(quota: QuotaDetail): string {
  if (quota.unlimited) {
    return "无限制"
  }

  return `剩余 ${formatNumber(quota.remaining)}`
}
