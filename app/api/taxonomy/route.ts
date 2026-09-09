import { NextResponse } from "next/server"
import { SETTINGS_TABLE, TAXONOMY_KEY, supabase } from "@/lib/supabase-server"
import { parseTaxonomy } from "@/lib/taxonomy"

export const dynamic = "force-dynamic"

/** Returns the shared taxonomy, or { taxonomy: null } when the defaults are in use. */
export async function GET() {
  const { data, error } = await supabase()
    .from(SETTINGS_TABLE)
    .select("value")
    .eq("key", TAXONOMY_KEY)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ taxonomy: data ? parseTaxonomy(data.value) : null })
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null)
  const taxonomy = parseTaxonomy(body)
  if (!taxonomy) return NextResponse.json({ error: "invalid taxonomy" }, { status: 400 })
  const { error } = await supabase()
    .from(SETTINGS_TABLE)
    .upsert({ key: TAXONOMY_KEY, value: taxonomy, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ taxonomy })
}

/** Reset to defaults. */
export async function DELETE() {
  const { error } = await supabase().from(SETTINGS_TABLE).delete().eq("key", TAXONOMY_KEY)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
