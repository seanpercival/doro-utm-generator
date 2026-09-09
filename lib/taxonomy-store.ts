"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import { DEFAULT_TAXONOMY, type Taxonomy, cleanTaxonomy, isDefaultTaxonomy } from "@/lib/taxonomy"

export type { OptionGroup, Taxonomy } from "@/lib/taxonomy"
export { DEFAULT_TAXONOMY, cleanTaxonomy, normalizeChannel, normalizePublisher, parseTaxonomy } from "@/lib/taxonomy"

type Status = "idle" | "loading" | "ready" | "error"
type State = { taxonomy: Taxonomy; status: Status; error: string | null }

// Module-level store shared by every component; the server snapshot is the defaults.
const SERVER_STATE: State = { taxonomy: DEFAULT_TAXONOMY, status: "idle", error: null }
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

async function load() {
  if (state.status === "loading") return
  setState({ status: "loading", error: null })
  try {
    const res = await fetch("/api/taxonomy", { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { taxonomy } = (await res.json()) as { taxonomy: Taxonomy | null }
    setState({ taxonomy: taxonomy ?? DEFAULT_TAXONOMY, status: "ready" })
  } catch (e) {
    setState({ status: "error", error: e instanceof Error ? e.message : "Failed to load options" })
  }
}

/** Shared dropdown lists, stored in Supabase and visible to everyone using the tool. */
export function useTaxonomy() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    if (state.status === "idle") void load()
  }, [])

  const save = useCallback(async (next: Taxonomy): Promise<boolean> => {
    const cleaned = cleanTaxonomy(next)
    try {
      const res = await fetch("/api/taxonomy", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cleaned),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState({ taxonomy: cleaned, status: "ready", error: null })
      return true
    } catch (e) {
      setState({ error: e instanceof Error ? e.message : "Failed to save options" })
      return false
    }
  }, [])

  const reset = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/taxonomy", { method: "DELETE" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState({ taxonomy: DEFAULT_TAXONOMY, status: "ready", error: null })
      return true
    } catch (e) {
      setState({ error: e instanceof Error ? e.message : "Failed to reset options" })
      return false
    }
  }, [])

  return {
    taxonomy: s.taxonomy,
    status: s.status,
    error: s.error,
    save,
    reset,
    reload: load,
    isCustomized: !isDefaultTaxonomy(s.taxonomy),
  }
}
