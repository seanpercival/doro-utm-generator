"use client"

import { useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import { Check, Copy, Download, Link2, Mail, RotateCcw, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  CHANNEL_GROUPS,
  COUNTRIES,
  CUSTOM_PUBLISHER,
  DEFAULT_COUNTRY,
  PUBLISHER_GROUPS,
  baseUrlFor,
  buildUtmUrl,
  channelDescription,
  countryLabel,
  sanitizeToken,
} from "@/lib/utm-config"

const countryItems = Object.fromEntries(COUNTRIES.map((c) => [c.code, `${c.flag} ${countryLabel(c)}`]))
const publisherItems: Record<string, string> = {
  ...Object.fromEntries(PUBLISHER_GROUPS.flatMap((g) => g.publishers.map((p) => [p, p]))),
  [CUSTOM_PUBLISHER]: "Other (custom)…",
}

const DEFAULTS = {
  country: DEFAULT_COUNTRY,
  medium: "paid_social_awa",
  source: "facebook",
}

export function UtmGenerator() {
  const [country, setCountry] = useState(DEFAULTS.country)
  const [landingPage, setLandingPage] = useState(() => baseUrlFor(DEFAULTS.country))
  const [medium, setMedium] = useState(DEFAULTS.medium)
  const [source, setSource] = useState(DEFAULTS.source)
  const [customSource, setCustomSource] = useState("")
  const [campaign, setCampaign] = useState("")
  const [content, setContent] = useState("")
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function")
  }, [])

  const resolvedSource = source === CUSTOM_PUBLISHER ? sanitizeToken(customSource) : source

  const generatedUrl = useMemo(
    () => buildUtmUrl({ landingPage, medium, source: resolvedSource, campaign, content }),
    [landingPage, medium, resolvedSource, campaign, content],
  )

  const isComplete = Boolean(generatedUrl)

  useEffect(() => {
    if (!generatedUrl) {
      setQrDataUrl("")
      return
    }
    let cancelled = false
    QRCode.toDataURL(generatedUrl, { width: 220, margin: 2 })
      .then((d) => {
        if (!cancelled) setQrDataUrl(d)
      })
      .catch(() => setQrDataUrl(""))
    return () => {
      cancelled = true
    }
  }, [generatedUrl])

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
    setCampaign("")
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
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="medium">
                    Channel <span className="text-destructive">*</span>{" "}
                    <span className="font-mono text-xs text-muted-foreground">utm_medium</span>
                  </Label>
                  <Select value={medium} onValueChange={(v) => v && setMedium(v)}>
                    <SelectTrigger id="medium" className="w-full">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNEL_GROUPS.map((g) => (
                        <SelectGroup key={g.label}>
                          <SelectLabel>{g.label}</SelectLabel>
                          {g.channels.map((ch) => (
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
                  <Select value={source} onValueChange={(v) => v && setSource(v)} items={publisherItems}>
                    <SelectTrigger id="source" className="w-full">
                      <SelectValue placeholder="Select publisher" />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLISHER_GROUPS.map((g) => (
                        <SelectGroup key={g.label}>
                          <SelectLabel>{g.label}</SelectLabel>
                          {g.publishers.map((p) => (
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
                  {source === CUSTOM_PUBLISHER && (
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
                  placeholder="e.g. black_friday_2026"
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
                    <dd className="font-mono">{medium}</dd>
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

                  <div className="grid grid-cols-2 gap-2">
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
                    {canShare && (
                      <Button onClick={handleShare} size="lg" variant="outline" className="col-span-2">
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

      <p className="mt-12 text-center text-xs text-muted-foreground">
        Taxonomy based on the Doro global UTM-tagging tool (PHD / Annalect, 2025). Channel list is global —
        coordinate changes with Annalect.
      </p>
    </div>
  )
}
