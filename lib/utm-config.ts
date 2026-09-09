/**
 * Doro UTM configuration.
 *
 * Mirrors the "NEW URL Builder" + "DATA" tabs of
 * "Doro - UTM-tagging tool - Global - 2025_by PHD.xlsx" (Annalect / PHD).
 *
 * Convention:
 *   utm_medium   = CHANNEL   (channel_objective, e.g. paid_social_awa)  — locked list
 *   utm_source   = PUBLISHER (platform / media partner)                  — extendable list
 *   utm_campaign = free text, short, lowercase, words separated by "_"
 *   utm_content  = optional creative variant (only appended when filled)
 *
 * Parameter order in the final URL follows the sheet:
 *   ?utm_medium=…&utm_source=…&utm_campaign=…[&utm_content=…]
 */

export type Country = {
  /** Doro locale sub-folder, e.g. "en-gb" */
  code: string
  name: string
  flag: string
  /** Shown when a country has more than one language site */
  language?: string
}

export const DORO_DOMAIN = "https://www.doro.com"

/** Source: https://www.doro.com/nb-no/change-country/ */
export const COUNTRIES: Country[] = [
  { code: "de-at", name: "Austria", flag: "🇦🇹" },
  { code: "fr-be", name: "Belgium", flag: "🇧🇪", language: "Français" },
  { code: "nl-be", name: "Belgium", flag: "🇧🇪", language: "Nederlands" },
  { code: "da-dk", name: "Denmark", flag: "🇩🇰" },
  { code: "fi-fi", name: "Finland", flag: "🇫🇮" },
  { code: "fr-fr", name: "France", flag: "🇫🇷" },
  { code: "de-de", name: "Germany", flag: "🇩🇪" },
  { code: "en-ie", name: "Ireland", flag: "🇮🇪" },
  { code: "it-it", name: "Italy", flag: "🇮🇹" },
  { code: "nl-nl", name: "Netherlands", flag: "🇳🇱" },
  { code: "nb-no", name: "Norway", flag: "🇳🇴" },
  { code: "es-es", name: "Spain", flag: "🇪🇸" },
  { code: "sv-se", name: "Sweden", flag: "🇸🇪" },
  { code: "fr-ch", name: "Switzerland", flag: "🇨🇭", language: "Français" },
  { code: "it-ch", name: "Switzerland", flag: "🇨🇭", language: "Italiano" },
  { code: "en-gb", name: "United Kingdom", flag: "🇬🇧" },
  { code: "en-us", name: "USA", flag: "🇺🇸" },
]

export const DEFAULT_COUNTRY = "en-gb"

export function countryLabel(c: Country) {
  return c.language ? `${c.name} (${c.language})` : c.name
}

export function baseUrlFor(code: string) {
  return `${DORO_DOMAIN}/${code}/`
}

/** Objective suffixes used by the channel taxonomy. */
export const OBJECTIVES: Record<string, string> = {
  awa: "Awareness",
  con: "Consideration",
  pur: "Purchase",
  crm: "CRM / existing customers",
}

export type ChannelGroup = {
  label: string
  channels: string[]
}

/**
 * utm_medium values — DATA!D "NEW CHANNELS (utm_medium)".
 * Per the READ ME tab this list is global and should not be changed
 * without coordinating with Annalect.
 */
export const CHANNEL_GROUPS: ChannelGroup[] = [
  { label: "Paid social", channels: ["paid_social_awa", "paid_social_con", "paid_social_pur"] },
  { label: "Display", channels: ["display_awa", "display_con", "display_pur"] },
  { label: "Native", channels: ["native_awa", "native_con"] },
  { label: "Paid video", channels: ["paid_video_awa", "paid_video_con", "paid_video_pur"] },
  { label: "Paid audio", channels: ["paid_audio_awa", "paid_audio_con"] },
  { label: "Paid search", channels: ["paid_search_awa", "paid_search_con", "paid_search_pur"] },
  { label: "Organic", channels: ["organic_social", "organic_video"] },
  { label: "Email", channels: ["email_con", "email_crm", "email_pur", "newsletter_partner"] },
  { label: "SMS", channels: ["sms_awa", "sms_con", "sms_pur"] },
  {
    label: "Affiliation",
    channels: [
      "affiliation-affinity",
      "affiliation-cashback",
      "affiliation-promo",
      "affiliation-email",
      "affiliation-other",
    ],
  },
  { label: "Offline", channels: ["qr"] },
]

export const CHANNELS = CHANNEL_GROUPS.flatMap((g) => g.channels)

export function channelDescription(channel: string): string {
  const m = channel.match(/_(awa|con|pur|crm)$/)
  if (m) return OBJECTIVES[m[1]]
  if (channel === "newsletter_partner") return "Partner newsletter"
  if (channel === "qr") return "QR code (print / packaging)"
  if (channel.startsWith("organic_")) return "Organic"
  return ""
}

export type PublisherGroup = {
  label: string
  publishers: string[]
}

/**
 * utm_source values — DATA!F "PUBLISHERS (utm_source)".
 * Values are kept exactly as in the sheet (including case) so new URLs
 * line up with historical GA4 data. New publishers can be added here.
 */
export const PUBLISHER_GROUPS: PublisherGroup[] = [
  {
    label: "Social",
    publishers: ["facebook", "instagram", "snapchat", "tiktok", "xtwitter", "linkedin", "pinterest", "youtube"],
  },
  { label: "Search", publishers: ["google", "bing"] },
  { label: "Programmatic / native", publishers: ["programmatic", "readpeak"] },
  { label: "Video / audio", publishers: ["viaplay", "tv4play", "dplay", "acast", "spotify"] },
  { label: "Owned / CRM", publishers: ["Doro", "email", "mailchimp", "sms", "qr"] },
  {
    label: "Media – Nordics & international",
    publishers: ["bonnier", "schibsted", "idg", "tv.nu", "eurogamer.net", "bauermedia", "planet"],
  },
  {
    label: "Media & affiliates – France",
    publishers: [
      "kwanko",
      "localvista",
      "Prisma",
      "SmileWanted",
      "RewordMedia",
      "teepyJob",
      "Brioude",
      "senioravotreservice",
      "Journalette",
      "Senioactu",
      "Carrefour",
      "grand-mercredi",
      "Silver Alliance",
      "santeMag",
      "T7J",
      "PoppeNative",
      "Le Point",
      "Bayard",
    ],
  },
  {
    label: "Influencers & UGC",
    publishers: [
      "FernBritton",
      "Lisa",
      "ValStones",
      "GrimeGran",
      "GrandadJoe",
      "Michelle",
      "ViviWallinInfluencer",
      "IrmaInfluencer",
      "MarkoolioInfluencer",
      "SindreUGC",
      "AlexandraJonerUGC",
      "SamuelMassieUGC",
    ],
  },
  { label: "Partners", publishers: ["Xplora"] },
]

export const PUBLISHERS = PUBLISHER_GROUPS.flatMap((g) => g.publishers)

/** Sentinel value for the "Other (custom)" publisher option. */
export const CUSTOM_PUBLISHER = "__custom__"

/**
 * Enforce the sheet's naming rules for free-text parameters:
 * lowercase, no special characters except "_", words separated by "_".
 */
export function sanitizeToken(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (é → e)
    .replace(/[\s\-.]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
}

export type UtmInput = {
  landingPage: string
  medium: string
  source: string
  campaign: string
  content?: string
}

/**
 * Build the final tracked URL. Matches the sheet formula:
 * appends with "?" or "&" depending on whether the landing page already
 * has a query string, orders params medium → source → campaign → content,
 * and only includes utm_content when it is filled in.
 */
export function buildUtmUrl({ landingPage, medium, source, campaign, content }: UtmInput): string {
  const raw = landingPage.trim()
  if (!raw || !medium || !source || !campaign) return ""
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return ""
  }
  const params = new URLSearchParams(url.search)
  params.set("utm_medium", medium)
  params.set("utm_source", source)
  params.set("utm_campaign", campaign)
  if (content) params.set("utm_content", content)
  else params.delete("utm_content")
  return `${url.origin}${url.pathname}?${params.toString()}${url.hash}`
}
