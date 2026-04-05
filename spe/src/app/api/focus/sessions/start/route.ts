import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const CONCENTRATION_TIPS = [
  "深呼吸して、タスクに集中しましょう",
  "小さなステップの積み重ねが大きな成果につながります",
  "完璧を目指さず、進捗を重視する",
  "25分後の達成感を想像してください",
  "通知はOFF、スマホは遠くへ",
  "今この瞬間に完全に集中する",
  "できないと思わず、やってみる",
  "短い集中が成功の鍵",
];

interface StartSessionRequest {
  user_id: string;
  mode_name: string;
  target_minutes: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: StartSessionRequest = await request.json();
    const { user_id, mode_name, target_minutes } = body;

    if (!user_id || !mode_name || !target_minutes) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const start_time = new Date().toISOString();

    const { data, error } = await supabase
      .from("focus_sessions")
      .insert({
        user_id,
        mode_name,
        target_minutes,
        start_time,
        session_status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const randomTip =
      CONCENTRATION_TIPS[Math.floor(Math.random() * CONCENTRATION_TIPS.length)];

    return NextResponse.json({
      session_id: data.id,
      mode_name: data.mode_name,
      start_time: data.start_time,
      target_minutes: data.target_minutes,
      tip: randomTip,
    });
  } catch (e) {
    console.error("Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
