/**
 * Shared timestamp formatting for consistent log output.
 */

const pad = (n: number): string => n.toString().padStart(2, "0")

function getTimestamp(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export function honoPrintFn(message: string, ...rest: Array<string>): void {
  console.log(`[${getTimestamp()}] ${message}`, ...rest)
}
