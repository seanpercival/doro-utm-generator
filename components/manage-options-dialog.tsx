"use client"

import { useRef, useState } from "react"
import { Download, Plus, RotateCcw, Trash2, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DEFAULT_TAXONOMY,
  type OptionGroup,
  type Taxonomy,
  cleanTaxonomy,
  normalizeChannel,
  normalizePublisher,
  parseTaxonomy,
} from "@/lib/taxonomy-store"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  taxonomy: Taxonomy
  onSave: (t: Taxonomy) => Promise<boolean>
  onReset: () => Promise<boolean>
}

export function ManageOptionsDialog({ open, onOpenChange, taxonomy, onSave, onReset }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Body is only mounted while open, so the draft starts fresh from the saved taxonomy each time. */}
      {open && <ManageOptionsBody taxonomy={taxonomy} onSave={onSave} onReset={onReset} onOpenChange={onOpenChange} />}
    </Dialog>
  )
}

function ManageOptionsBody({ onOpenChange, taxonomy, onSave, onReset }: Omit<Props, "open">) {
  // Work on a draft so Cancel discards edits.
  const [draft, setDraft] = useState<Taxonomy>(() => structuredClone(taxonomy))
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const updateGroups = (key: keyof Taxonomy, groups: OptionGroup[]) =>
    setDraft((d) => ({ ...d, [key]: groups }))

  const handleSave = async () => {
    const cleaned = cleanTaxonomy(draft)
    if (cleaned.channelGroups.length === 0 || cleaned.publisherGroups.length === 0) {
      setError("You need at least one channel and one publisher.")
      return
    }
    setBusy(true)
    const ok = await onSave(cleaned)
    setBusy(false)
    if (!ok) {
      setError("Could not save to the shared database. Please try again.")
      return
    }
    onOpenChange(false)
  }

  const handleReset = async () => {
    if (!window.confirm("Restore the default channel and publisher lists for everyone? Custom edits will be lost.")) return
    setBusy(true)
    const ok = await onReset()
    setBusy(false)
    if (!ok) {
      setError("Could not reset the shared lists. Please try again.")
      return
    }
    setDraft(structuredClone(DEFAULT_TAXONOMY))
    setError("")
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(cleanTaxonomy(draft), null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "doro-utm-options.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const parsed = parseTaxonomy(JSON.parse(await file.text()))
      if (!parsed) throw new Error("bad shape")
      setDraft(parsed)
      setError("")
    } catch {
      setError("That file is not a valid options export.")
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage dropdown options</DialogTitle>
          <DialogDescription>
            Add, rename or remove channels (utm_medium) and publishers (utm_source). Saved lists are shared
            with everyone who uses this tool. Export / Import lets you back up or restore a list as JSON.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="channels" className="gap-3">
          <TabsList className="w-full">
            <TabsTrigger value="channels">Channels · utm_medium</TabsTrigger>
            <TabsTrigger value="publishers">Publishers · utm_source</TabsTrigger>
          </TabsList>
          <TabsContent value="channels">
            <p className="mb-2 text-xs text-muted-foreground">
              Lowercase, use _ between words and an objective suffix (awa / con / pur / crm). This list is
              global per the Annalect sheet — coordinate changes with them.
            </p>
            <GroupEditor
              groups={draft.channelGroups}
              onChange={(g) => updateGroups("channelGroups", g)}
              normalize={normalizeChannel}
              placeholder="e.g. paid_social_awa"
            />
          </TabsContent>
          <TabsContent value="publishers">
            <p className="mb-2 text-xs text-muted-foreground">
              Platform or media partner. Keep existing spelling and case so reports line up with historical
              data.
            </p>
            <GroupEditor
              groups={draft.publisherGroups}
              onChange={(g) => updateGroups("publisherGroups", g)}
              normalize={normalizePublisher}
              placeholder="e.g. aftonbladet"
            />
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => handleImport(e.target.files?.[0])}
        />

        <DialogFooter className="sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={busy}>
              <RotateCcw data-icon="inline-start" />
              Reset to defaults
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download data-icon="inline-start" />
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload data-icon="inline-start" />
              Import
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy ? "Saving…" : "Save for everyone"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
  )
}

type GroupEditorProps = {
  groups: OptionGroup[]
  onChange: (groups: OptionGroup[]) => void
  normalize: (s: string) => string
  placeholder: string
}

function GroupEditor({ groups, onChange, normalize, placeholder }: GroupEditorProps) {
  const [newOption, setNewOption] = useState<Record<number, string>>({})

  const setGroup = (i: number, g: OptionGroup) => onChange(groups.map((x, j) => (j === i ? g : x)))
  const removeGroup = (i: number) => onChange(groups.filter((_, j) => j !== i))
  const addGroup = () => onChange([...groups, { label: "New group", options: [] }])

  const addOption = (i: number) => {
    const value = normalize(newOption[i] ?? "")
    if (!value) return
    const g = groups[i]
    if (!g.options.includes(value)) setGroup(i, { ...g, options: [...g.options, value] })
    setNewOption((m) => ({ ...m, [i]: "" }))
  }

  return (
    <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
      {groups.map((g, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="mb-2 flex items-center gap-2">
            <Input
              value={g.label}
              onChange={(e) => setGroup(i, { ...g, label: e.target.value })}
              className="h-8 font-medium"
              aria-label="Group name"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removeGroup(i)}
              aria-label={`Remove group ${g.label}`}
              title="Remove group"
            >
              <Trash2 />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.options.map((opt, k) => (
              <span
                key={`${opt}-${k}`}
                className="inline-flex items-center gap-1 rounded-md bg-secondary py-0.5 pr-0.5 pl-2 font-mono text-xs"
              >
                {opt}
                <button
                  type="button"
                  onClick={() => setGroup(i, { ...g, options: g.options.filter((_, j) => j !== k) })}
                  className="rounded p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                  aria-label={`Remove ${opt}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {g.options.length === 0 && (
              <span className="text-xs text-muted-foreground">No options yet — empty groups are dropped on save.</span>
            )}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              addOption(i)
            }}
          >
            <Input
              value={newOption[i] ?? ""}
              onChange={(e) => setNewOption((m) => ({ ...m, [i]: e.target.value }))}
              placeholder={placeholder}
              className="h-8 font-mono text-xs"
              aria-label={`Add option to ${g.label}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addOption(i)
                }
              }}
            />
            <Button type="submit" variant="outline" size="sm">
              <Plus data-icon="inline-start" />
              Add
            </Button>
          </form>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addGroup} className="w-full">
        <Plus data-icon="inline-start" />
        Add group
      </Button>
    </div>
  )
}
