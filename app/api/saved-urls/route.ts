import { NextResponse } from "next/server"
import { SAVED_URLS_TABLE, supabase } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

const COLUMNS = "id, url, country, medium, source, campaign, content, note, created_at"

export async function GET() {
  const { data, error } = await supabase()
    .from(SAVED_URLS_TABLE)
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data })
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body.url !== "string" || !body.url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 })
  }
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).slice(0, 500) : "")
  const row = {
    url: body.url.slice(0, 2000),
    country: str("country"),
    medium: str("medium"),
    source: str("source"),
    campaign: str("campaign"),
    content: str("content"),
    note: str("note"),
  }
  const { data, error } = await supabase().from(SAVED_URLS_TABLE).insert(row).select(COLUMNS).single()
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "exists" }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ entry: data }, { status: 201 })
}

/** Clear the whole log. */
export async function DELETE() {
  const { error } = await supabase().from(SAVED_URLS_TABLE).delete().not("id", "is", null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
