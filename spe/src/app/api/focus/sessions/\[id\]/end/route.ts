import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

interface EndSessionRequest {
  user_id: string;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body: EndSessionRequest = await request.json();
    const { user_id } = body;
    const session_id = parseInt(params.id);

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const end_time = new Date().toISOString();

    // Get the session first
    const { data: sessionData, error: fetchError } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("user_id", user_id)
      .single();

    if (fetchError || !sessionData) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Calculate actual minutes
    const startTime = new Date(sessionData.start_time);
    const endTime = new Date(end_time);
    const actual_minutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000
    );

    // Update the session
    const { data, error } = await supabase
      .from("focus_sessions")
      .update({
        end_time,
        actual_minutes,
        session_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      session_id: data.id,
      actual_minutes: data.actual_minutes,
      end_time: data.end_time,
      break_options: [3, 5],
    });
  } catch (e) {
    console.error("Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
