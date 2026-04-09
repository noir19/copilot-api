import {
  AlertCircle,
  Database,
  FileDown,
  KeyRound,
  TimerReset,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"

function PlaceholderConfigCard({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: React.ReactNode
  description: string
  icon: typeof AlertCircle
  title: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-slate-900 p-2 text-slate-50">
          <Icon className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-slate-900">{title}</p>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export function SettingsPanel() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>更多设置</CardTitle>
        <CardDescription>
          当前只有模型别名和展示映射接入了真实后端，其他控制项仍然是占位。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 bg-slate-50/70">
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-500 p-2 text-white">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-slate-900">预留配置区域</p>
              <p className="max-w-3xl text-sm leading-6 text-slate-700">
                这里先展示后续准备接入的配置项形态，避免只剩一整片空白占位。当前这些卡片仍然是只读假数据，真正可写的配置暂时只有“模型别名”和“展示映射”。
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <PlaceholderConfigCard
            description="用于展示后续 Token 文件路径、热重载与认证来源的配置形态。"
            icon={KeyRound}
            title="Token 与认证"
          >
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="settings-gh-token-file"
              >
                GitHub Token 文件
              </label>
              <Input
                disabled
                id="settings-gh-token-file"
                value="/root/.local/share/copilot-api/github_token"
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="settings-token-policy"
              >
                热重载策略
              </label>
              <Input
                disabled
                id="settings-token-policy"
                value="文件变更后自动 reload 并刷新 Copilot token"
              />
            </div>
          </PlaceholderConfigCard>

          <PlaceholderConfigCard
            description="用于展示请求日志保留窗口、清理频率与数据库位置等未来配置。"
            icon={Database}
            title="日志与 SQLite"
          >
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="settings-db-path"
              >
                SQLite 路径
              </label>
              <Input
                disabled
                id="settings-db-path"
                value="/root/.local/share/copilot-api/copilot-api.db"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="settings-retention-days"
                >
                  日志保留天数
                </label>
                <Input disabled id="settings-retention-days" value="15" />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="settings-cleanup-interval"
                >
                  清理间隔
                </label>
                <Input
                  disabled
                  id="settings-cleanup-interval"
                  value="21600000 ms"
                />
              </div>
            </div>
          </PlaceholderConfigCard>

          <PlaceholderConfigCard
            description="用于展示异步写库队列和失败重试窗口等运行时参数。"
            icon={TimerReset}
            title="异步队列"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="settings-flush-interval"
                >
                  Flush 间隔
                </label>
                <Input disabled id="settings-flush-interval" value="500 ms" />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="settings-batch-size"
                >
                  批量大小
                </label>
                <Input disabled id="settings-batch-size" value="100" />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="settings-retry-window"
                >
                  重试窗口
                </label>
                <Input disabled id="settings-retry-window" value="120000 ms" />
              </div>
            </div>
            <Textarea
              className="min-h-32"
              disabled
              value="后续可以在这里补充 dropped count、当前队列深度、最近一次 flush 错误与背压策略。现在先用只读卡片把未来配置结构固定下来。"
            />
          </PlaceholderConfigCard>

          <PlaceholderConfigCard
            description="用于展示请求日志导出、诊断包与排障辅助功能的预留交互。"
            icon={FileDown}
            title="导出与排障"
          >
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="settings-export-format"
              >
                导出格式
              </label>
              <Input
                disabled
                id="settings-export-format"
                value="JSON Lines / CSV / SQLite Snapshot"
              />
            </div>
            <Textarea
              className="min-h-40"
              disabled
              value="预留说明：
1. 可导出最近 24 小时请求日志
2. 可按模型、状态码、路由筛选
3. 可生成最小诊断包，便于容器排障

这些能力当前还没有接后端，只做页面占位。"
            />
          </PlaceholderConfigCard>
        </div>
      </CardContent>
    </Card>
  )
}
