import { useCallback, useEffect, useState } from "react"

import {
  loadSettings,
  type SettingsResponse,
  saveSettings,
} from "../../lib/dashboard-api"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"

interface SettingsForm {
  retentionMonths: string
  sinkFlushIntervalMs: string
  sinkBatchSize: string
  sinkMaxQueueSize: string
  sinkMaxRetryAttempts: string
  sinkRetryWindowMs: string
}

const DEFAULTS: SettingsForm = {
  retentionMonths: "2",
  sinkFlushIntervalMs: "500",
  sinkBatchSize: "100",
  sinkMaxQueueSize: "10000",
  sinkMaxRetryAttempts: "5",
  sinkRetryWindowMs: "120000",
}

function toForm(data: SettingsResponse): SettingsForm {
  const s = data.settings
  const c = data.sinkConfig
  return {
    retentionMonths: s.retention_months ?? DEFAULTS.retentionMonths,
    sinkFlushIntervalMs: s.sink_flush_interval_ms ?? String(c.flushIntervalMs),
    sinkBatchSize: s.sink_batch_size ?? String(c.batchSize),
    sinkMaxQueueSize: s.sink_max_queue_size ?? String(c.maxQueueSize),
    sinkMaxRetryAttempts:
      s.sink_max_retry_attempts ?? String(c.maxRetryAttempts),
    sinkRetryWindowMs: s.sink_retry_window_ms ?? String(c.retryWindowMs),
  }
}

function toEntries(form: SettingsForm): Record<string, string> {
  return {
    retention_months: form.retentionMonths,
    sink_flush_interval_ms: form.sinkFlushIntervalMs,
    sink_batch_size: form.sinkBatchSize,
    sink_max_queue_size: form.sinkMaxQueueSize,
    sink_max_retry_attempts: form.sinkMaxRetryAttempts,
    sink_retry_window_ms: form.sinkRetryWindowMs,
  }
}

function FieldRow({
  htmlFor,
  label,
  suffix,
  value,
  onChange,
}: {
  htmlFor: string
  label: string
  suffix?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          className="h-8 tabular-nums"
          id={htmlFor}
          onChange={(e) => onChange(e.target.value)}
          type="number"
          min="1"
          value={value}
        />
        {suffix ? (
          <span className="shrink-0 text-xs text-slate-500">{suffix}</span>
        ) : null}
      </div>
    </div>
  )
}

export function SettingsPanel() {
  const [form, setForm] = useState<SettingsForm>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await loadSettings()
      setForm(toForm(data))
    } catch {
      setMessage("加载配置失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const update = (key: keyof SettingsForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setMessage(null)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await saveSettings(toEntries(form))
      setMessage("配置已保存")
    } catch {
      setMessage("保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-500">
        加载配置中...
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">日志保留策略</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldRow
            htmlFor="retention-months"
            label="保留月数"
            suffix="个自然月"
            value={form.retentionMonths}
            onChange={update("retentionMonths")}
          />
          <p className="mt-2 text-xs text-slate-500">
            每月1日清理，保留当前月及之前N个完整自然月的日志。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">异步队列参数</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldRow
              htmlFor="sink-flush-interval"
              label="刷新间隔"
              suffix="ms"
              value={form.sinkFlushIntervalMs}
              onChange={update("sinkFlushIntervalMs")}
            />
            <FieldRow
              htmlFor="sink-batch-size"
              label="批次大小"
              value={form.sinkBatchSize}
              onChange={update("sinkBatchSize")}
            />
            <FieldRow
              htmlFor="sink-max-queue"
              label="最大队列长度"
              value={form.sinkMaxQueueSize}
              onChange={update("sinkMaxQueueSize")}
            />
            <FieldRow
              htmlFor="sink-max-retry"
              label="最大重试次数"
              value={form.sinkMaxRetryAttempts}
              onChange={update("sinkMaxRetryAttempts")}
            />
          </div>
          <FieldRow
            htmlFor="sink-retry-window"
            label="重试窗口"
            suffix="ms"
            value={form.sinkRetryWindowMs}
            onChange={update("sinkRetryWindowMs")}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 xl:col-span-2">
        {message ? (
          <span className="text-sm text-slate-600">{message}</span>
        ) : null}
        <Button disabled={saving} onClick={handleSave}>
          {saving ? "保存中..." : "保存配置"}
        </Button>
      </div>
    </div>
  )
}
