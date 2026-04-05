import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

interface BreakEndRequest {
  user_id: string;
  break_minutes: number;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body: BreakEndRequest = await request.json();
    const { user_id, break_minutes } = body;
    const session_id = parseInt(params.id);

    if (!user_id || !break_minutes) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const break_end_time = new Date().toISOString();

    const { data, error } = await supabase
      .from("focus_sessions")
      .update({
        break_minutes,
        break_end_time,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session_id)
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      session_id: data.id,
      break_minutes: data.break_minutes,
      break_end_time: data.break_end_time,
    });
  } catch (e) {
    console.error("Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
