import { NextResponse } from "next/server"
import { SAVED_URLS_TABLE, supabase } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const body = (await req.json().catch(() => null)) as { note?: unknown } | null
  if (!body || typeof body.note !== "string") {
    return NextResponse.json({ error: "note must be a string" }, { status: 400 })
  }
  const { error } = await supabase()
    .from(SAVED_URLS_TABLE)
    .update({ note: body.note.slice(0, 2000) })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const { error } = await supabase().from(SAVED_URLS_TABLE).delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
