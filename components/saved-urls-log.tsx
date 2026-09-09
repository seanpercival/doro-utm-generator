"use client"

import { useState } from "react"
import { AlertCircle, Bookmark, Check, Copy, Download, Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { type NoteStatus, type SavedUrl, toCsv } from "@/lib/saved-urls-store"
import { COUNTRIES } from "@/lib/utm-config"

type Props = {
  entries: SavedUrl[]
  status: "idle" | "loading" | "ready" | "error"
  error: string | null
  onReload: () => void
  noteStatus: Record<string, NoteStatus>
  onSetNote: (id: string, note: string) => void
  onRetryNote: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
}

const countryFlag = (code: string) => COUNTRIES.find((c) => c.code === code)?.flag ?? ""

function formatDate(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function NoteStatusBadge({ status, onRetry }: { status?: NoteStatus; onRetry: () => void }) {
  if (!status) return null
  const base = "inline-flex shrink-0 items-center gap-1 text-xs whitespace-nowrap"
  switch (status) {
    case "pending":
    case "saving":
      return (
        <span className={`${base} text-muted-foreground`} aria-live="polite">
          <Loader2 className="size-3 animate-spin" />
          Saving…
        </span>
      )
    case "saved":
      return (
        <span className={`${base} text-primary`} aria-live="polite">
          <Check className="size-3" />
          Saved
        </span>
      )
    case "error":
      return (
        <button type="button" onClick={onRetry} className={`${base} text-destructive hover:underline`} aria-live="polite">
          <AlertCircle className="size-3" />
          Not saved — retry
        </button>
      )
  }
}

export function SavedUrlsLog({
  entries,
  status,
  error,
  onReload,
  noteStatus,
  onSetNote,
  onRetryNote,
  onRemove,
  onClear,
}: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copy = async (e: SavedUrl) => {
    await navigator.clipboard.writeText(e.url)
    setCopiedId(e.id)
    setTimeout(() => setCopiedId((c) => (c === e.id ? null : c)), 1500)
  }

  const exportCsv = () => {
    const blob = new Blob([toCsv(entries)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `doro-utm-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearAll = () => {
    if (window.confirm(`Delete all ${entries.length} saved URLs for everyone? This cannot be undone.`)) onClear()
  }

  return (
    <Card id="saved-urls">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="size-5 text-primary" />
          Saved campaign URLs
          {entries.length > 0 && (
            <span className="rounded-full bg-secondary px-2 text-xs font-medium text-secondary-foreground">
              {entries.length}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Every URL saved with the Save button, shared with everyone who uses this tool.
        </CardDescription>
        {entries.length > 0 && (
          <CardAction className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download data-icon="inline-start" />
              Export CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <Trash2 data-icon="inline-start" />
              Clear all
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-3 flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <span>{error}</span>
            <Button variant="ghost" size="xs" onClick={onReload}>
              Retry
            </Button>
          </p>
        )}
        {status === "loading" || status === "idle" ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading saved URLs…</p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No saved URLs yet. Generate a URL above and press <span className="font-medium">Save</span>.
          </p>
        ) : (
          <ul className="divide-y">
            {entries.map((e) => (
              <li key={e.id} className="grid gap-2 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatDate(e.created_at)}</span>
                    <span>
                      {countryFlag(e.country)} {e.country}
                    </span>
                    <span className="font-mono">{e.medium}</span>
                    <span className="font-mono">{e.source}</span>
                    <span className="font-mono font-medium text-foreground">{e.campaign}</span>
                    {e.content && <span className="font-mono">{e.content}</span>}
                  </div>
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block font-mono text-xs leading-relaxed break-all text-foreground/80 hover:text-primary hover:underline"
                  >
                    {e.url}
                  </a>
                  <div className="flex items-center gap-2">
                    <Input
                      value={e.note}
                      onChange={(ev) => onSetNote(e.id, ev.target.value)}
                      placeholder="Add a note (e.g. where this link is used, who owns it) — saves automatically"
                      className="h-8 text-xs"
                      aria-label="Note"
                    />
                    <NoteStatusBadge status={noteStatus[e.id]} onRetry={() => onRetryNote(e.id)} />
                  </div>
                </div>
                <div className="flex gap-1 md:flex-col">
                  <Button variant="outline" size="sm" onClick={() => copy(e)} className="flex-1 md:flex-none">
                    {copiedId === e.id ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                    {copiedId === e.id ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(e.id)}
                    className="flex-1 text-destructive hover:text-destructive md:flex-none"
                    aria-label={`Delete ${e.campaign}`}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
