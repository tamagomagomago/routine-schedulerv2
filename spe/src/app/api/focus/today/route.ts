import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];

    // Get today's sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", user_id)
      .eq("session_status", "completed")
      .gte("start_time", `${today}T00:00:00`)
      .lt("start_time", `${today}T23:59:59`);

    if (sessionsError) {
      console.error("Sessions error:", sessionsError);
      return NextResponse.json(
        { error: sessionsError.message },
        { status: 500 }
      );
    }

    // Get today's goal
    const { data: goals } = await supabase
      .from("focus_goals")
      .select("*")
      .eq("user_id", user_id)
      .eq("goal_type", "daily")
      .gte("start_date", today)
      .lte("end_date", today);

    // Calculate stats
    const total_minutes = (sessions || []).reduce(
      (sum, s) => sum + (s.actual_minutes || 0),
      0
    );

    const breakdown_by_mode: Record<string, number> = {};
    (sessions || []).forEach((session) => {
      breakdown_by_mode[session.mode_name] =
        (breakdown_by_mode[session.mode_name] || 0) + (session.actual_minutes || 0);
    });

    const today_goal_minutes = goals && goals.length > 0 ? goals[0].target_minutes : 120;

    return NextResponse.json({
      total_minutes,
      session_count: sessions?.length || 0,
      breakdown_by_mode,
      sessions: sessions || [],
      today_goal_minutes,
    });
  } catch (e) {
    console.error("GET /api/focus/today error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
