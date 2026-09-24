import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Check, Loader, Plus, Share2, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OfflineBanner } from "@/components/offline-banner"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { shareText } from "@/lib/share"
import {
  createHabit,
  loadHabits,
  postHabit,
  requestHabitSync,
  saveHabits,
  syncPendingHabits,
  type Habit,
} from "@/lib/habits"
import { HABIT_SYNC_WAKE } from "@/lib/sync"

export function App() {
  const [habits, setHabits] = useState<Habit[]>(loadHabits)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const online = useOnlineStatus()

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    const markSynced = (ids: string[]) => {
      const synced = new Set(ids)
      setHabits((prev) => {
        const next = prev.map((habit) =>
          synced.has(habit.id) ? { ...habit, status: "synced" as const } : habit,
        )
        saveHabits(next)
        return next
      })
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === HABIT_SYNC_WAKE) {
        void syncPendingHabits(markSynced)
      }
    }
    const onOnline = () => {
      void syncPendingHabits(markSynced)
    }

    navigator.serviceWorker.addEventListener("message", onMessage)
    window.addEventListener("online", onOnline)
    void syncPendingHabits(markSynced)

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage)
      window.removeEventListener("online", onOnline)
    }
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || submitting) return
    const habit = createHabit(trimmed)
    setSubmitting(true)
    setHabits((prev) => {
      const next = [habit, ...prev]
      saveHabits(next)
      return next
    })
    setName("")
    if (await postHabit(habit)) {
      setHabits((prev) => {
        const next = prev.map((h) => (h.id === habit.id ? { ...h, status: "synced" as const } : h))
        saveHabits(next)
        return next
      })
    } else {
      await requestHabitSync()
    }
    setSubmitting(false)
  }

  const pendingCount = habits.filter((habit) => habit.status === "pending").length

  const handleShare = async () => {
    const lines = habits.map((habit) => `- ${habit.name}`).join("\n")
    const text = lines
      ? `My task habits:\n${lines}`
      : "No habits yet — add your first task habit."
    const result = await shareText(text)
    if (result === "copied") {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      <OfflineBanner />
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-base font-semibold tracking-tight">Task habits</h1>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
              {online ? "Online" : "Offline"}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleShare()}>
              {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
              {copied ? "Copied" : "Share"}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <form onSubmit={handleSubmit} className="flex max-w-xl gap-2">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Drink water"
            className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader className="animate-spin" /> : <Plus />}
            Add
          </Button>
        </form>
        <p className="mt-2 max-w-xl text-xs text-muted-foreground">
          Habits added while offline are queued and sync automatically when you reconnect.
          Press key d to turn to dark and light mode
        </p>
        {habits.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            No habits yet. Add your first one above.
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {habits.map((habit) => (
              <li
                key={habit.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <span className="min-w-0 truncate text-sm">{habit.name}</span>
                <span
                  className={
                    habit.status === "pending"
                      ? "inline-flex shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-400"
                      : "inline-flex shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"
                  }
                >
                  {habit.status === "pending" ? "Queued" : "Synced"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {pendingCount > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {pendingCount === 1 ? "1 habit" : `${pendingCount} habits`} queued — will sync on
            reconnect.
          </p>
        )}
      </main>
    </div>
  )
}

export default App