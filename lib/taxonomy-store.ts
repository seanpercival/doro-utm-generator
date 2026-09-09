"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { CHANNEL_GROUPS, PUBLISHER_GROUPS } from "@/lib/utm-config"

/** A named group of dropdown options (used for both channels and publishers). */
export type OptionGroup = {
  label: string
  options: string[]
}

export type Taxonomy = {
  channelGroups: OptionGroup[]
  publisherGroups: OptionGroup[]
}

export const STORAGE_KEY = "doro-utm-taxonomy-v1"

export const DEFAULT_TAXONOMY: Taxonomy = {
  channelGroups: CHANNEL_GROUPS.map((g) => ({ label: g.label, options: [...g.channels] })),
  publisherGroups: PUBLISHER_GROUPS.map((g) => ({ label: g.label, options: [...g.publishers] })),
}

/** Channel values: lowercase, "_" or "-" allowed, nothing else. */
export function normalizeChannel(v: string) {
  return v
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
}

/** Publisher values: keep case (matches historical GA4 data), just trim. */
export function normalizePublisher(v: string) {
  return v.trim()
}

/** Drop empty labels/options and duplicates, so a saved taxonomy is always clean. */
export function cleanTaxonomy(t: Taxonomy): Taxonomy {
  const clean = (groups: OptionGroup[], norm: (s: string) => string) => {
    const seen = new Set<string>()
    return groups
      .map((g) => ({
        label: g.label.trim() || "Untitled",
        options: g.options
          .map(norm)
          .filter((o) => {
            if (!o || seen.has(o)) return false
            seen.add(o)
            return true
          }),
      }))
      .filter((g) => g.options.length > 0)
  }
  return {
    channelGroups: clean(t.channelGroups, normalizeChannel),
    publisherGroups: clean(t.publisherGroups, normalizePublisher),
  }
}

function isOptionGroupArray(v: unknown): v is OptionGroup[] {
  return (
    Array.isArray(v) &&
    v.every(
      (g) =>
        g &&
        typeof g === "object" &&
        typeof (g as OptionGroup).label === "string" &&
        Array.isArray((g as OptionGroup).options) &&
        (g as OptionGroup).options.every((o) => typeof o === "string"),
    )
  )
}

/** Validate untrusted JSON (localStorage or an imported file). Returns null if invalid. */
export function parseTaxonomy(raw: unknown): Taxonomy | null {
  if (!raw || typeof raw !== "object") return null
  const t = raw as Partial<Taxonomy>
  if (!isOptionGroupArray(t.channelGroups) || !isOptionGroupArray(t.publisherGroups)) return null
  const cleaned = cleanTaxonomy({ channelGroups: t.channelGroups, publisherGroups: t.publisherGroups })
  if (cleaned.channelGroups.length === 0 || cleaned.publisherGroups.length === 0) return null
  return cleaned
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

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
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function getServerSnapshot(): string | null {
  return null
}

function parseRaw(raw: string | null): Taxonomy | null {
  if (!raw) return null
  try {
    return parseTaxonomy(JSON.parse(raw))
  } catch {
    return null
  }
}

/**
 * Taxonomy state persisted in the browser (localStorage), exposed as an external store
 * so the server render and first client render both see the defaults (no hydration mismatch).
 */
export function useTaxonomy() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const taxonomy = useMemo(() => parseRaw(raw) ?? DEFAULT_TAXONOMY, [raw])

  const save = useCallback((next: Taxonomy) => {
    const cleaned = cleanTaxonomy(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
    } catch {
      /* storage unavailable (private mode etc.) */
    }
    emit()
  }, [])

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    emit()
  }, [])

  const isCustomized = useMemo(
    () => JSON.stringify(taxonomy) !== JSON.stringify(DEFAULT_TAXONOMY),
    [taxonomy],
  )

  return { taxonomy, save, reset, isCustomized }
}
