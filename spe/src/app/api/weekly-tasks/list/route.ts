import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const week = searchParams.get("week");
    const month = searchParams.get("month");

    if (!week || !month) {
      return NextResponse.json(
        { error: "Missing week and month parameters" },
        { status: 400 }
      );
    }

    // 週間タスクと関連するサブタスクを取得
    const { data: weeklyTasks, error: tasksError } = await supabase
      .from("weekly_tasks")
      .select(
        `
        *,
        weekly_subtasks(*)
      `
      )
      .eq("user_id", "default_user")
      .eq("week_number", parseInt(week))
      .like("month", `${month}%`)
      .order("category", { ascending: true });

    if (tasksError) throw tasksError;

    return NextResponse.json({ tasks: weeklyTasks || [] });
  } catch (err) {
    console.error("Failed to fetch weekly tasks:", err);
    return NextResponse.json(
      { error: "Failed to fetch weekly tasks" },
      { status: 500 }
    );
  }
}
