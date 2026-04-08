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
        <CardTitle>Additional settings</CardTitle>
        <CardDescription>
          Only model mappings are live in this phase. Other controls stay as
          placeholders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-slate-900 p-2 text-slate-50">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-slate-900">
                Planned configuration surface
              </p>
              <Textarea
                disabled
                value="Future phases can add token paths, retention controls, sink tuning, or log exports here. This placeholder stays non-functional by design."
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
