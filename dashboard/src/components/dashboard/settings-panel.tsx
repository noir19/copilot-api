import { AlertCircle } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { Textarea } from "../ui/textarea"

export function SettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>更多设置</CardTitle>
        <CardDescription>
          当前只有模型别名和展示映射接入了真实后端，其他控制项仍然是占位。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-slate-900 p-2 text-slate-50">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-slate-900">预留配置区域</p>
              <Textarea
                disabled
                value="后续可以在这里补充 token 路径、日志保留策略、异步队列参数或日志导出能力。目前这个区域刻意保持为只读占位。"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
