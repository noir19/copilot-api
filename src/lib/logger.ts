/**
 * Shared timestamp formatting for consistent log output.
 */

const formatter = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

export function honoPrintFn(message: string, ...rest: Array<string>): void {
  console.log(`[${formatter.format(new Date())}] ${message}`, ...rest)
}
