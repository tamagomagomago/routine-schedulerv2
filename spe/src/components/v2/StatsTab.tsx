"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { WeeklyReviewV2, CATEGORY_EMOJI } from "@/types/v2";

interface StatsData {
  focusByCategory: Record<string, number>;
  weeklyFocus: { week: string; minutes: number }[];
  goalAchievementTrend: { week: string; rate: number }[];
  weeklyDaily?: { day: string; categories: Record<string, number> }[];
}

const BAR_COLORS: Record<string, string> = {
  fitness: "#fb923c",
  engineer: "#2dd4bf",
  video: "#f97316",
  english: "#60a5fa",
  investment: "#4ade80",
  ai: "#a855f7",
  personal: "#9ca3af",
  life_design: "#ec4899",
};

export default function StatsTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [reviews, setReviews] = useState<WeeklyReviewV2[]>([]);
  const [reviewForm, setReviewForm] = useState({ achievement_rate: 70, memo: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/v2/stats?weeks=4").then((r) => r.json()).catch(() => null),
      fetch("/api/v2/reviews?limit=8").then((r) => r.json()).catch(() => []),
    ]).then(([s, r]) => {
      if (s && !s.error) setStats(s);
      const reviewList: WeeklyReviewV2[] = Array.isArray(r) ? r : [];
      setReviews(reviewList);
      // 今週のレビューがあれば読み込む
      const thisWeek = getThisWeekMonday();
      const existing = reviewList.find((rv: WeeklyReviewV2) => rv.week_start === thisWeek);
      if (existing) setReviewForm({ achievement_rate: existing.achievement_rate ?? 70, memo: existing.memo ?? "" });
    });
  }, []);

  const handleSaveReview = async () => {
    setSaving(true);
    try {
      await fetch("/api/v2/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: getThisWeekMonday(), ...reviewForm }),
      });
      const res = await fetch("/api/v2/reviews?limit=8");
      setReviews(await res.json());
    } finally {
      setSaving(false);
    }
  };

  const catData = stats
    ? Object.entries(stats.focusByCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, minutes]) => ({ cat, minutes, label: `${CATEGORY_EMOJI[cat] ?? "📌"} ${cat}` }))
    : [];

  const weeklyData = (stats?.weeklyFocus ?? []).map((w) => ({
    week: formatWeekLabel(w.week),
    minutes: w.minutes,
  }));

  const trendData = (stats?.goalAchievementTrend ?? []).map((t) => ({
    week: formatWeekLabel(t.week),
    rate: t.rate,
  }));

  // weeklyDaily をフラット化してカテゴリをトップレベルキーにする
  const weeklyDailyFlat = (stats?.weeklyDaily ?? []).map((day) => ({
    day: day.day,
    ...day.categories,
  }));

  return (
    <div className="pb-24 px-4 pt-4 space-y-6">
      {/* カテゴリ別集中時間 */}
      <section>
        <h3 className="text-yellow-400 text-sm font-semibold mb-3">📊 過去4週間のカテゴリ別集中時間</h3>
        {catData.length === 0 ? (
          <p className="text-gray-600 text-xs text-center py-4">データなし</p>
        ) : (
          <div className="space-y-2">
            {catData.map(({ cat, minutes, label } : { cat?: string; minutes: number; label: string }) => {
              const total = catData.reduce((s, d) => s + d.minutes, 0);
              const pct = total > 0 ? Math.round((minutes / total) * 100) : 0;
              const color = BAR_COLORS[(cat as string) ?? "personal"] ?? "#9ca3af";
              return (
                <div key={label} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300">{label}</span>
                    <span className="text-gray-500">{minutes}分 ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 週別集中時間グラフ */}
      {weeklyData.length > 0 && (
        <section>
          <h3 className="text-yellow-400 text-sm font-semibold mb-3">📈 週別集中時間（4週）</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="week" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e5e7eb" }}
                formatter={(v: number) => [`${v}分`, "集中"]}
              />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {weeklyData.map((_, i) => (
                  <Cell key={i} fill={i === weeklyData.length - 1 ? "#3b82f6" : "#1e40af"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* 今週の日別実施時間（カテゴリ別） */}
      {weeklyDailyFlat.length > 0 && (
        <section>
          <h3 className="text-yellow-400 text-sm font-semibold mb-3">📅 今週の日別実施時間（カテゴリ別）</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyDailyFlat} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e5e7eb" }}
                formatter={(v: number) => `${v}分`}
              />
              {/* 各カテゴリのバーを積み重ねる */}
              {Object.keys(BAR_COLORS).map((category) => (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="a"
                  fill={BAR_COLORS[category]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
          {/* カテゴリ凡例 */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            {Object.entries(BAR_COLORS).map(([category, color]) => {
              const totalMinutes = weeklyDailyFlat.reduce((sum, day) => sum + (day[category as keyof typeof day] ?? 0), 0);
              return totalMinutes > 0 ? (
                <div key={category} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                  <span className="text-gray-400">{category}</span>
                </div>
              ) : null;
            })}
          </div>
        </section>
      )}

      {/* 今週の投下時間サマリー */}
      {(stats?.weeklyDaily ?? []).length > 0 && (() => {
        const dailySummary = (stats?.weeklyDaily ?? []).map((day) => {
          const total = Object.entries(day.categories ?? {}).reduce((sum, [cat, mins]) => {
            if (cat === "personal") return sum;
            return sum + (mins ?? 0);
          }, 0);
          return { day: day.day, total };
        });
        const weeklyTotal = dailySummary.reduce((sum, d) => sum + d.total, 0);
        const maxDaily = Math.max(...dailySummary.map(d => d.total));

        return (
          <section>
            <h3 className="text-yellow-400 text-sm font-semibold mb-3">⏱️ 今週の投下時間サマリー（勉強時間）</h3>
            <div className="space-y-3">
              {/* 曜日ごと */}
              <div className="space-y-2">
                {dailySummary.map(({ day, total }) => {
                  const pct = maxDaily > 0 ? (total / maxDaily) * 100 : 0;
                  return (
                    <div key={day} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-300 w-8">{day}</span>
                        <span className="text-gray-500 flex-1 text-right">{total}分</span>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-gradient-to-r from-blue-500 to-cyan-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* 今週の合計 */}
              <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border border-blue-700/50 rounded-lg p-3 mt-4">
                <div className="text-xs text-gray-400 mb-1">今週の投下時間合計</div>
                <div className="text-3xl font-bold text-cyan-400">{Math.floor(weeklyTotal / 60)}h {weeklyTotal % 60}m</div>
                <div className="text-xs text-gray-600 mt-1">{weeklyTotal}分</div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* 目標達成率トレンド */}
      {trendData.length > 0 && (
        <section>
          <h3 className="text-yellow-400 text-sm font-semibold mb-3">🎯 週次達成率トレンド</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="week" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e5e7eb" }}
                formatter={(v: number) => [`${v}%`, "達成率"]}
              />
              <Line type="monotone" dataKey="rate" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* 週次レビュー */}
      <section>
        <h3 className="text-yellow-400 text-sm font-semibold mb-3">📝 今週のレビュー</h3>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>達成率</span>
              <span className="font-bold text-white">{reviewForm.achievement_rate}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={reviewForm.achievement_rate}
              onChange={(e) => setReviewForm({ ...reviewForm, achievement_rate: Number(e.target.value) })}
              className="w-full accent-green-500"
            />
            <div className="flex justify-between text-xs text-gray-700 mt-1">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
          <textarea
            placeholder="今週の振り返り・来週の改善点..."
            value={reviewForm.memo}
            onChange={(e) => setReviewForm({ ...reviewForm, memo: e.target.value })}
            rows={3}
            className="w-full bg-gray-800 text-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-yellow-500"
          />
          <button
            onClick={handleSaveReview}
            disabled={saving}
            className="w-full py-2 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "保存中..." : "レビューを保存"}
          </button>
        </div>
      </section>

      {/* 過去のレビュー */}
      {reviews.length > 0 && (
        <section>
          <h3 className="text-gray-500 text-xs font-semibold mb-2">過去のレビュー</h3>
          <div className="space-y-2">
            {reviews.slice(0, 4).map((r) => (
              <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{formatWeekLabel(r.week_start)}の週</span>
                  <span className={`text-xs font-bold ${(r.achievement_rate ?? 0) >= 70 ? "text-green-400" : (r.achievement_rate ?? 0) >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                    {r.achievement_rate ?? "—"}%
                  </span>
                </div>
                {r.memo && <p className="text-xs text-gray-600 mt-0.5 truncate">{r.memo}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function getThisWeekMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  return monday.toISOString().split("T")[0];
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
