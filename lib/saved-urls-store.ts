"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

export type SavedUrl = {
  id: string
  url: string
  country: string
  medium: string
  source: string
  campaign: string
  content: string
  note: string
  createdAt: string // ISO timestamp
}

export const SAVED_KEY = "doro-utm-saved-v1"

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(SAVED_KEY)
  } catch {
    return null
  }
}
const getServerSnapshot = (): string | null => null

function parse(raw: string | null): SavedUrl[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v.filter(
      (e) => e && typeof e === "object" && typeof e.id === "string" && typeof e.url === "string",
    ) as SavedUrl[]
  } catch {
    return []
  }
}

function write(entries: SavedUrl[]) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(entries))
  } catch {
    /* storage unavailable */
  }
  emit()
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Saved campaign URLs, persisted in the browser (localStorage), newest first. */
export function useSavedUrls() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const entries = useMemo(() => parse(raw), [raw])

  /** Adds an entry. Returns false (and does nothing) if the same URL is already saved. */
  const add = useCallback(
    (entry: Omit<SavedUrl, "id" | "createdAt" | "note">): boolean => {
      const current = parse(getSnapshot())
      if (current.some((e) => e.url === entry.url)) return false
      write([{ ...entry, id: newId(), note: "", createdAt: new Date().toISOString() }, ...current])
      return true
    },
    [],
  )

  const setNote = useCallback((id: string, note: string) => {
    write(parse(getSnapshot()).map((e) => (e.id === id ? { ...e, note } : e)))
  }, [])

  const remove = useCallback((id: string) => {
    write(parse(getSnapshot()).filter((e) => e.id !== id))
  }, [])

  const clear = useCallback(() => write([]), [])

  return { entries, add, setNote, remove, clear }
}

/** CSV export of the log (Excel-friendly). */
export function toCsv(entries: SavedUrl[]): string {
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const header = ["created", "country", "campaign", "utm_medium", "utm_source", "utm_content", "note", "url"]
  const rows = entries.map((e) =>
    [e.createdAt, e.country, e.campaign, e.medium, e.source, e.content, e.note, e.url].map(esc).join(","),
  )
  return [header.join(","), ...rows].join("\n")
}
