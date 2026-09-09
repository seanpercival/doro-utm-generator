"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import QRCode from "qrcode"
import { Bookmark, BookmarkCheck, Check, Copy, Download, Link2, Mail, RotateCcw, Settings2, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ManageOptionsDialog } from "@/components/manage-options-dialog"
import { SavedUrlsLog } from "@/components/saved-urls-log"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSavedUrls } from "@/lib/saved-urls-store"
import { useTaxonomy } from "@/lib/taxonomy-store"
import {
  COUNTRIES,
  CUSTOM_PUBLISHER,
  DEFAULT_COUNTRY,
  baseUrlFor,
  buildUtmUrl,
  channelDescription,
  countryLabel,
  sanitizeToken,
} from "@/lib/utm-config"

const countryItems = Object.fromEntries(COUNTRIES.map((c) => [c.code, `${c.flag} ${countryLabel(c)}`]))

const noopSubscribe = () => () => {}
const canShareSnapshot = () => typeof navigator !== "undefined" && typeof navigator.share === "function"
const canShareServer = () => false

const DEFAULTS = {
  country: DEFAULT_COUNTRY,
  medium: "paid_social_awa",
  source: "facebook",
  /** Pre-filled so the full URL, QR code and actions are visible on load. */
  campaign: "campaign_name",
}

export function UtmGenerator() {
  const [country, setCountry] = useState(DEFAULTS.country)
  const [landingPage, setLandingPage] = useState(() => baseUrlFor(DEFAULTS.country))
  const [medium, setMedium] = useState(DEFAULTS.medium)
  const [source, setSource] = useState(DEFAULTS.source)
  const [customSource, setCustomSource] = useState("")
  const [campaign, setCampaign] = useState(DEFAULTS.campaign)
  const [content, setContent] = useState("")
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState<{ url: string; data: string } | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saved" | "exists">("idle")
  const savedUrls = useSavedUrls()
  const canShare = useSyncExternalStore(noopSubscribe, canShareSnapshot, canShareServer)

  const { taxonomy, save: saveTaxonomy, reset: resetTaxonomy, isCustomized } = useTaxonomy()
  const channelGroups = taxonomy.channelGroups
  const publisherGroups = taxonomy.publisherGroups
  const allChannels = useMemo(() => channelGroups.flatMap((g) => g.options), [channelGroups])
  const allPublishers = useMemo(() => publisherGroups.flatMap((g) => g.options), [publisherGroups])
  const publisherItems = useMemo<Record<string, string>>(
    () => ({ ...Object.fromEntries(allPublishers.map((p) => [p, p])), [CUSTOM_PUBLISHER]: "Other (custom)…" }),
    [allPublishers],
  )

  // If a selected option was removed via "Manage options", fall back to the first available one.
  const effectiveMedium = allChannels.includes(medium) ? medium : (allChannels[0] ?? "")
  const effectiveSource =
    source === CUSTOM_PUBLISHER || allPublishers.includes(source) ? source : (allPublishers[0] ?? "")

  const resolvedSource = effectiveSource === CUSTOM_PUBLISHER ? sanitizeToken(customSource) : effectiveSource

  const generatedUrl = useMemo(
    () => buildUtmUrl({ landingPage, medium: effectiveMedium, source: resolvedSource, campaign, content }),
    [landingPage, effectiveMedium, resolvedSource, campaign, content],
  )

  const isComplete = Boolean(generatedUrl)

  useEffect(() => {
    if (!generatedUrl) return
    let cancelled = false
    QRCode.toDataURL(generatedUrl, { width: 220, margin: 2 })
      .then((data) => {
        if (!cancelled) setQr({ url: generatedUrl, data })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [generatedUrl])

  // Only show a QR code that matches the current URL.
  const qrDataUrl = qr && qr.url === generatedUrl ? qr.data : ""

  const handleCountryChange = (code: string | null) => {
    if (!code) return
    setCountry(code)
    setLandingPage(baseUrlFor(code))
  }

  const handleCopy = async () => {
    if (!generatedUrl) return
    await navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = () => {
    if (!generatedUrl) return
    const added = savedUrls.add({
      url: generatedUrl,
      country,
      medium: effectiveMedium,
      source: resolvedSource,
      campaign,
      content,
    })
    setSaveState(added ? "saved" : "exists")
    setTimeout(() => setSaveState("idle"), 2000)
  }

  const handleEmail = () => {
    if (!generatedUrl) return
    const subject = encodeURIComponent(`Doro campaign URL – ${campaign}`)
    const body = encodeURIComponent(`Campaign URL:\n\n${generatedUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handleShare = async () => {
    if (!generatedUrl || !navigator.share) return
    try {
      await navigator.share({ title: "Doro campaign URL", text: "Campaign tracking URL", url: generatedUrl })
    } catch {
      /* user cancelled */
    }
  }

  const handleDownloadQr = () => {
    if (!qrDataUrl) return
    const a = document.createElement("a")
    a.download = `doro-${country}-${campaign || "utm"}-qr.png`
    a.href = qrDataUrl
    a.click()
  }

  const handleReset = () => {
    setCountry(DEFAULTS.country)
    setLandingPage(baseUrlFor(DEFAULTS.country))
    setMedium(DEFAULTS.medium)
    setSource(DEFAULTS.source)
    setCustomSource("")
    setCampaign(DEFAULTS.campaign)
    setContent("")
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Doro</p>
        <h1 className="mb-3 text-4xl font-bold tracking-tight">Doro UTM Generator</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Generate consistent UTM parameters for cross-market campaign tracking on doro.com
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Select Country</CardTitle>
              <CardDescription>Sets the doro.com market sub-folder</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={country} onValueChange={handleCountryChange} items={countryItems}>
                <SelectTrigger className="w-full" aria-label="Country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span>{c.flag}</span>
                      <span>{countryLabel(c)}</span>
                      <span className="ml-auto pl-2 font-mono text-xs text-muted-foreground">/{c.code}/</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Landing Page</CardTitle>
              <CardDescription>Edit to point at a product, category or campaign page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                id="landingPage"
                placeholder="https://www.doro.com/en-gb/"
                value={landingPage}
                onChange={(e) => setLandingPage(e.target.value)}
                className="w-full font-mono text-sm"
                aria-label="Landing page URL"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Campaign Details</CardTitle>
              <CardDescription>Fill in the tracking parameters</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
                  <Settings2 data-icon="inline-start" />
                  Manage options
                  {isCustomized && (
                    <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                      edited
                    </span>
                  )}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="medium">
                    Channel <span className="text-destructive">*</span>{" "}
                    <span className="font-mono text-xs text-muted-foreground">utm_medium</span>
                  </Label>
                  <Select value={effectiveMedium} onValueChange={(v) => v && setMedium(v)}>
                    <SelectTrigger id="medium" className="w-full">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channelGroups.map((g) => (
                        <SelectGroup key={g.label}>
                          <SelectLabel>{g.label}</SelectLabel>
                          {g.options.map((ch) => (
                            <SelectItem key={ch} value={ch}>
                              <span className="font-mono">{ch}</span>
                              <span className="ml-auto pl-2 text-xs text-muted-foreground">
                                {channelDescription(ch)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    awa = awareness · con = consideration · pur = purchase · crm = existing customers
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">
                    Publisher <span className="text-destructive">*</span>{" "}
                    <span className="font-mono text-xs text-muted-foreground">utm_source</span>
                  </Label>
                  <Select value={effectiveSource} onValueChange={(v) => v && setSource(v)} items={publisherItems}>
                    <SelectTrigger id="source" className="w-full">
                      <SelectValue placeholder="Select publisher" />
                    </SelectTrigger>
                    <SelectContent>
                      {publisherGroups.map((g) => (
                        <SelectGroup key={g.label}>
                          <SelectLabel>{g.label}</SelectLabel>
                          {g.options.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                      <SelectGroup>
                        <SelectLabel>Not listed?</SelectLabel>
                        <SelectItem value={CUSTOM_PUBLISHER}>Other (custom)…</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {effectiveSource === CUSTOM_PUBLISHER && (
                    <Input
                      id="customSource"
                      placeholder="e.g. aftonbladet"
                      value={customSource}
                      onChange={(e) => setCustomSource(sanitizeToken(e.target.value))}
                      aria-label="Custom publisher"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign">
                  Campaign <span className="text-destructive">*</span>{" "}
                  <span className="font-mono text-xs text-muted-foreground">utm_campaign</span>
                </Label>
                <Input
                  id="campaign"
                  placeholder="e.g. black_friday_2026, aurora_launch"
                  value={campaign}
                  onChange={(e) => setCampaign(sanitizeToken(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Keep it short, in English, lowercase, words separated by _ (no special characters)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">
                  Creative variant (optional){" "}
                  <span className="font-mono text-xs text-muted-foreground">utm_content</span>
                </Label>
                <Input
                  id="content"
                  placeholder="e.g. video_v1, blue_glasses"
                  value={content}
                  onChange={(e) => setContent(sanitizeToken(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Use for A/B tests on creative only — may limit platform optimisation
                </p>
              </div>

              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCcw data-icon="inline-start" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="h-fit lg:sticky lg:top-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="size-5 text-primary" />
                Generated URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isComplete ? (
                <>
                  <div className="rounded-lg bg-secondary p-4 font-mono text-sm leading-relaxed break-all">
                    {generatedUrl}
                  </div>

                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                    <dt className="font-mono text-muted-foreground">utm_medium</dt>
                    <dd className="font-mono">{effectiveMedium}</dd>
                    <dt className="font-mono text-muted-foreground">utm_source</dt>
                    <dd className="font-mono">{resolvedSource}</dd>
                    <dt className="font-mono text-muted-foreground">utm_campaign</dt>
                    <dd className="font-mono">{campaign}</dd>
                    {content && (
                      <>
                        <dt className="font-mono text-muted-foreground">utm_content</dt>
                        <dd className="font-mono">{content}</dd>
                      </>
                    )}
                  </dl>

                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={handleCopy} size="lg">
                      {copied ? (
                        <>
                          <Check data-icon="inline-start" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy data-icon="inline-start" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button onClick={handleEmail} size="lg" variant="outline">
                      <Mail data-icon="inline-start" />
                      Email
                    </Button>
                    <Button onClick={handleSave} size="lg" variant="outline" title="Save to the log below">
                      {saveState === "idle" ? (
                        <>
                          <Bookmark data-icon="inline-start" />
                          Save
                        </>
                      ) : (
                        <>
                          <BookmarkCheck data-icon="inline-start" />
                          {saveState === "saved" ? "Saved!" : "Already saved"}
                        </>
                      )}
                    </Button>
                    {canShare && (
                      <Button onClick={handleShare} size="lg" variant="outline" className="col-span-3">
                        <Share2 data-icon="inline-start" />
                        Share
                      </Button>
                    )}
                  </div>

                  {qrDataUrl && (
                    <div className="border-t pt-4">
                      <div className="space-y-3 text-center">
                        <p className="text-sm font-medium">QR Code</p>
                        <div className="flex justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={qrDataUrl} alt="QR code for generated URL" className="rounded-lg border" />
                        </div>
                        <Button onClick={handleDownloadQr} size="sm" variant="outline" className="w-full">
                          <Download data-icon="inline-start" />
                          Download QR Code
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  Fill in all required fields to generate the URL
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <SavedUrlsLog
          entries={savedUrls.entries}
          onSetNote={savedUrls.setNote}
          onRemove={savedUrls.remove}
          onClear={savedUrls.clear}
        />
      </div>

      <ManageOptionsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        taxonomy={taxonomy}
        onSave={saveTaxonomy}
        onReset={resetTaxonomy}
      />

      <p className="mt-12 text-center text-xs text-muted-foreground">
        Taxonomy based on the Doro global UTM-tagging tool (PHD / Annalect, 2025). Channel list is global —
        coordinate changes with Annalect.
      </p>
    </div>
  )
}
