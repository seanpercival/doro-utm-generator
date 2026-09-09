"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"

export type SavedUrl = {
  id: string
  url: string
  country: string
  medium: string
  source: string
  campaign: string
  content: string
  note: string
  created_at: string // ISO timestamp
}

type Status = "idle" | "loading" | "ready" | "error"
/** Per-entry note save state: pending = waiting for typing to stop, saving = request in flight. */
export type NoteStatus = "pending" | "saving" | "saved" | "error"
type State = {
  entries: SavedUrl[]
  status: Status
  error: string | null
  noteStatus: Record<string, NoteStatus>
}

const SERVER_STATE: State = { entries: [], status: "idle", error: null, noteStatus: {} }
let state: State = SERVER_STATE
const listeners = new Set<() => void>()

function setState(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getSnapshot = () => state
const getServerSnapshot = () => SERVER_STATE

const fail = (e: unknown, fallback: string) =>
  setState({ error: e instanceof Error ? e.message : fallback })

async function load() {
  if (state.status === "loading") return
  setState({ status: "loading", error: null })
  try {
    const res = await fetch("/api/saved-urls", { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { entries } = (await res.json()) as { entries: SavedUrl[] }
    setState({ entries, status: "ready" })
  } catch (e) {
    setState({ status: "error" })
    fail(e, "Failed to load saved URLs")
  }
}

// Debounced note updates so typing doesn't fire a request per keystroke.
const NOTE_DEBOUNCE_MS = 800
const noteTimers = new Map<string, ReturnType<typeof setTimeout>>()
const noteClearTimers = new Map<string, ReturnType<typeof setTimeout>>()

function setNoteStatus(id: string, status: NoteStatus | null) {
  const next = { ...state.noteStatus }
  if (status) next[id] = status
  else delete next[id]
  setState({ noteStatus: next })
}

async function saveNote(id: string, note: string) {
  setNoteStatus(id, "saving")
  try {
    const res = await fetch(`/api/saved-urls/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    setNoteStatus(id, "saved")
    clearTimeout(noteClearTimers.get(id))
    noteClearTimers.set(id, setTimeout(() => setNoteStatus(id, null), 2500))
  } catch {
    setNoteStatus(id, "error")
  }
}

export type AddResult = "saved" | "exists" | "error"

/** Saved campaign URLs, stored in Supabase and shared with everyone using the tool. Newest first. */
export function useSavedUrls() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    if (state.status === "idle") void load()
  }, [])

  const add = useCallback(
    async (entry: Omit<SavedUrl, "id" | "created_at" | "note">): Promise<AddResult> => {
      if (state.entries.some((e) => e.url === entry.url)) return "exists"
      try {
        const res = await fetch("/api/saved-urls", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(entry),
        })
        if (res.status === 409) return "exists"
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { entry: saved } = (await res.json()) as { entry: SavedUrl }
        setState({ entries: [saved, ...state.entries], error: null })
        return "saved"
      } catch (e) {
        fail(e, "Failed to save URL")
        return "error"
      }
    },
    [],
  )

  const setNote = useCallback((id: string, note: string) => {
    // Optimistic local update; the PATCH fires once typing pauses.
    setState({ entries: state.entries.map((e) => (e.id === id ? { ...e, note } : e)) })
    clearTimeout(noteClearTimers.get(id))
    setNoteStatus(id, "pending")
    clearTimeout(noteTimers.get(id))
    noteTimers.set(id, setTimeout(() => void saveNote(id, note), NOTE_DEBOUNCE_MS))
  }, [])

  /** Retry a failed note save immediately. */
  const retryNote = useCallback((id: string) => {
    const entry = state.entries.find((e) => e.id === id)
    if (!entry) return
    clearTimeout(noteTimers.get(id))
    void saveNote(id, entry.note)
  }, [])

  const remove = useCallback(async (id: string) => {
    const previous = state.entries
    setState({ entries: previous.filter((e) => e.id !== id) })
    try {
      const res = await fetch(`/api/saved-urls/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      setState({ entries: previous })
      fail(e, "Failed to delete URL")
    }
  }, [])

  const clear = useCallback(async () => {
    const previous = state.entries
    setState({ entries: [] })
    try {
      const res = await fetch("/api/saved-urls", { method: "DELETE" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      setState({ entries: previous })
      fail(e, "Failed to clear the log")
    }
  }, [])

  return {
    entries: s.entries,
    status: s.status,
    error: s.error,
    noteStatus: s.noteStatus,
    add,
    setNote,
    retryNote,
    remove,
    clear,
    reload: load,
  }
}

/** CSV export of the log (Excel-friendly). */
export function toCsv(entries: SavedUrl[]): string {
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const header = ["created", "country", "campaign", "utm_medium", "utm_source", "utm_content", "note", "url"]
  const rows = entries.map((e) =>
    [e.created_at, e.country, e.campaign, e.medium, e.source, e.content, e.note, e.url].map(esc).join(","),
  )
  return [header.join(","), ...rows].join("\n")
}
