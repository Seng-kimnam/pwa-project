import { HABITS_API, HABIT_SYNC_TAG } from "./sync"

export type HabitStatus = "pending" | "synced"

export type Habit = {
  id: string
  name: string
  createdAt: number
  status: HabitStatus
}

export const HABITS_STORAGE_KEY = "pwa-task:habits"

export function createHabit(name: string): Habit {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    status: "pending",
  }
}

export function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(HABITS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Habit[]) : []
  } catch {
    return []
  }
}

export function saveHabits(habits: Habit[]): void {
  localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits))
}

export async function postHabit(habit: Habit): Promise<boolean> {
  try {
    const response = await fetch(HABITS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(habit),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function requestHabitSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    const withSync = registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> }
    }
    await withSync.sync?.register(HABIT_SYNC_TAG)
  } catch {
    return
  }
}

let syncInFlight = false

export async function syncPendingHabits(onSynced?: (ids: string[]) => void): Promise<void> {
  if (syncInFlight) return
  syncInFlight = true
  try {
    await requestHabitSync()
    const habits = loadHabits()
    const pending = habits.filter((habit) => habit.status === "pending")
    if (pending.length === 0) return
    const syncedIds: string[] = []
    for (const habit of pending) {
      if (await postHabit(habit)) syncedIds.push(habit.id)
    }
    if (syncedIds.length === 0) return
    const synced = new Set(syncedIds)
    const next = habits.map((habit) =>
      synced.has(habit.id) ? { ...habit, status: "synced" as const } : habit,
    )
    saveHabits(next)
    onSynced?.(syncedIds)
  } finally {
    syncInFlight = false
  }
}