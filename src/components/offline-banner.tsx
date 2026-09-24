import { WifiOff } from "lucide-react"
import { useOnlineStatus } from "@/hooks/use-online-status"

export function OfflineBanner() {
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-medium text-white"
    >
      <WifiOff className="size-4 shrink-0" />
      <span>You are offline — new habits are queued and will sync on reconnect.</span>
    </div>
  )
}