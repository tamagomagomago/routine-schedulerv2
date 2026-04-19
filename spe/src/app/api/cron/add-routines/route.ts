import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 朝5時に実行: ルーティンから本日のTODOを自動生成するcronエンドポイント
 *
 * 動作:
 * 1. 有効なルーティンを取得
 * 2. 本日の曜日に合致するルーティンをフィルタリング
 * 3. 重複チェック後、今日のTODOに追加
 * 4. 管理者に通知
 */
export async function GET(request: Request) {
  // Vercel Cron の検証
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const today = new Date();
    const todayDateStr = today.toISOString().split("T")[0];
    const dayOfWeek = today.getDay(); // 0=日, 1=月, ..., 6=土
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 1. 有効なルーティンをすべて取得
    const { data: routines, error: routinesError } = await supabase
      .from("routines")
      .select("id, title, category, estimated_minutes, scheduled_start, weekday_types")
      .eq("user_id", "default_user")
      .eq("is_enabled", true);

    if (routinesError) {
      throw new Error(`Failed to fetch routines: ${routinesError.message}`);
    }

    if (!routines || routines.length === 0) {
      return NextResponse.json({
        success: true,
        added: 0,
        message: "No enabled routines found",
      });
    }

    // 2. 本日の曜日に合致するルーティンをフィルタリング
    const todayRoutines = routines.filter((routine) => {
      const weekdayTypes = routine.weekday_types || { weekdays: false, weekends: false };

      if (isWeekday && weekdayTypes.weekdays) return true;
      if (isWeekend && weekdayTypes.weekends) return true;

      return false;
    });

    if (todayRoutines.length === 0) {
      return NextResponse.json({
        success: true,
        added: 0,
        message: "No routines match today's weekday",
      });
    }

    // 3. 重複チェック後、今日のTODOに追加
    let addedCount = 0;
    let skippedCount = 0;

    for (const routine of todayRoutines) {
      // 同じタイトル・スケジュール日付・カテゴリのTODOが既に存在するか確認
      const { data: existing, error: checkError } = await supabase
        .from("todos_v2")
        .select("id")
        .eq("user_id", "default_user")
        .eq("title", routine.title)
        .eq("scheduled_date", todayDateStr)
        .eq("category", routine.category)
        .is("goal_id", null)
        .limit(1);

      if (checkError) {
        console.warn(`Error checking for duplicate routine "${routine.title}":`, checkError);
        continue;
      }

      // 既に存在する場合はスキップ
      if (existing && existing.length > 0) {
        skippedCount++;
        continue;
      }

      // 新規作成
      const { error: insertError } = await supabase
        .from("todos_v2")
        .insert({
          user_id: "default_user",
          title: routine.title,
          category: routine.category,
          estimated_minutes: routine.estimated_minutes || 30,
          scheduled_date: todayDateStr,
          scheduled_start: routine.scheduled_start,
          priority: 3,
          is_completed: false,
          goal_id: null,
        });

      if (insertError) {
        console.error(`Failed to add routine "${routine.title}" to today:`, insertError);
      } else {
        addedCount++;
      }
    }

    // 4. 管理者に通知（Pushover）
    if (addedCount > 0) {
      try {
        await fetch("https://api.pushover.net/1/messages.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: process.env.PUSHOVER_APP_TOKEN,
            user: process.env.PUSHOVER_USER_KEY,
            message: `✅ 朝のルーティン: ${addedCount}個のタスクを追加しました ${skippedCount > 0 ? `（重複: ${skippedCount}個）` : ""}`,
            priority: 0,
          }),
        });
      } catch (err) {
        console.warn("Failed to send Pushover notification:", err);
      }
    }

    return NextResponse.json({
      success: true,
      added: addedCount,
      skipped: skippedCount,
      message: `Added ${addedCount} routines to today's tasks (skipped ${skippedCount} duplicates)`,
    });
  } catch (err) {
    console.error("Cron add-routines failed:", err);
    return NextResponse.json(
      { error: "Failed to process cron task", details: String(err) },
      { status: 500 }
    );
  }
}
