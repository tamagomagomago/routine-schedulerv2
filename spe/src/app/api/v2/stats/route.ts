import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weeks = Number(searchParams.get("weeks") ?? "4");

  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  // 集中セッション（期間内）
  const { data: sessions } = await supabase
    .from("focus_sessions_v2")
    .select("category, actual_minutes, planned_minutes, started_at")
    .eq("user_id", "default_user")
    .gte("started_at", since.toISOString())
    .not("ended_at", "is", null);

  // カテゴリ別集計
  const focusByCategory: Record<string, number> = {};
  (sessions ?? []).forEach((s) => {
    const min = s.actual_minutes ?? s.planned_minutes ?? 0;
    focusByCategory[s.category] = (focusByCategory[s.category] ?? 0) + min;
  });

  // 週別集計
  const weekMap: Record<string, number> = {};
  (sessions ?? []).forEach((s) => {
    const d = new Date(s.started_at);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const key = monday.toISOString().split("T")[0];
    weekMap[key] = (weekMap[key] ?? 0) + (s.actual_minutes ?? s.planned_minutes ?? 0);
  });

  const weeklyFocus = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, minutes]) => ({ week, minutes }));

  // 週次達成率トレンド（weekly_reviews から）
  const { data: reviews } = await supabase
    .from("weekly_reviews_v2")
    .select("week_start, achievement_rate")
    .eq("user_id", "default_user")
    .gte("week_start", since.toISOString().split("T")[0])
    .order("week_start", { ascending: true });

  const goalAchievementTrend = (reviews ?? []).map((r) => ({
    week: r.week_start,
    rate: r.achievement_rate ?? 0,
  }));

  // 今週の日別実施時間
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekMonday = new Date(today);
  weekMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekMonday.setHours(0, 0, 0, 0);

  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekMonday.getDate() + 6);
  weekSunday.setHours(23, 59, 59, 999);

  const dailyMap: Record<string, number> = {};
  const dayLabels = ["月", "火", "水", "木", "金", "土", "日"];

  // 初期化（月～日）
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekMonday);
    d.setDate(weekMonday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    dailyMap[dateStr] = 0;
  }

  // 今週のセッションを集計
  (sessions ?? []).forEach((s) => {
    const d = new Date(s.started_at);
    const dateStr = d.toISOString().split("T")[0];
    if (dateStr >= weekMonday.toISOString().split("T")[0] && dateStr <= weekSunday.toISOString().split("T")[0]) {
      dailyMap[dateStr] = (dailyMap[dateStr] ?? 0) + (s.actual_minutes ?? s.planned_minutes ?? 0);
    }
  });

  const weeklyDaily = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes], idx) => {
      const d = new Date(date);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return {
        day: `${dayLabels[idx]} ${month}/${day}`,
        minutes,
      };
    });

  return NextResponse.json({ focusByCategory, weeklyFocus, goalAchievementTrend, weeklyDaily });
}
