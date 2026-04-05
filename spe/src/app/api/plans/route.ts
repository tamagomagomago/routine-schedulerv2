/**
 * GET    /api/plans?date=YYYY-MM-DD  → その日のAI計画を取得
 * POST   /api/plans                  → AI計画を保存（upsert）
 * DELETE /api/plans?date=YYYY-MM-DD  → AI計画を削除
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("daily_plans")
      .select("*")
      .eq("date", date)
      .maybeSingle();

    if (error) {
      // Table doesn't exist or other error - return null gracefully
      if (error.message.includes("relation") || error.message.includes("does not exist")) {
        return NextResponse.json(null);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? null);
  } catch (e) {
    // Missing env var or other initialization error
    return NextResponse.json(null);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, plan_text, ai_blocks, slot_notes, custom_blocks } = body;
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("daily_plans")
      .upsert(
        { date, plan_text, ai_blocks, slot_notes, custom_blocks, updated_at: new Date().toISOString() },
        { onConflict: "date" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get("date");
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

    const supabase = createServerClient();
    const { error } = await supabase.from("daily_plans").delete().eq("date", date);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
