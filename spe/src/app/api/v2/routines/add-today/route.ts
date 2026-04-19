import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 手動で今日のルーティンを追加するエンドポイント
 * Vercel Cron が利用できない環境用の代替手段
 */
export async function POST() {
  try {
    const today = new Date();
    const todayDateStr = today.toISOString().split("T")[0];
    const dayOfWeek = today.getDay(); // 0=日, 1=月, ..., 6=土

    // 曜日を英語の小文字に変換
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[dayOfWeek];

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
        skipped: 0,
        message: "No enabled routines found",
      });
    }

    // 2. 本日の曜日に合致するルーティンをフィルタリング
    const todayRoutines = routines.filter((routine) => {
      const weekdayTypes = routine.weekday_types || {};

      // 新しい形式（個別曜日指定）に対応
      if (todayName in weekdayTypes) {
        return weekdayTypes[todayName] === true;
      }

      // 後方互換性：古い形式（weekdays/weekends）に対応
      if ('weekdays' in weekdayTypes && 'weekends' in weekdayTypes) {
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekday && weekdayTypes.weekdays) return true;
        if (isWeekend && weekdayTypes.weekends) return true;
      }

      return false;
    });

    if (todayRoutines.length === 0) {
      return NextResponse.json({
        success: true,
        added: 0,
        skipped: 0,
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

    return NextResponse.json({
      success: true,
      added: addedCount,
      skipped: skippedCount,
      message: `Added ${addedCount} routines to today's tasks ${skippedCount > 0 ? `(skipped ${skippedCount} duplicates)` : ""}`,
    });
  } catch (err) {
    console.error("Failed to add today's routines:", err);
    return NextResponse.json(
      { error: "Failed to add routines", details: String(err) },
      { status: 500 }
    );
  }
}
