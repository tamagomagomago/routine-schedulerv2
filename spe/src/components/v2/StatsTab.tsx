"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { WeeklyReviewV2, CATEGORY_EMOJI, CATEGORY_LABEL } from "@/types/v2";

interface StatsData {
  focusByCategory: Record<string, number>;
  weeklyFocus: { week: string; minutes: number }[];
  goalAchievementTrend: { week: string; rate: number }[];
  weeklyDaily?: { day: string; categories: Record<string, number> }[];
}

interface PDCAForm {
  plan_achievements: Array<{ category: string; rate: number; reason: string }>;
  learnings: string[];
  current_state: string;
  next_week_adjustments: string[];
  selected_categories?: string[];
}

const BAR_COLORS: Record<string, string> = {
  engineer: "#2dd4bf",
  fitness: "#fb923c",
  video: "#f97316",
  english: "#60a5fa",
  investment: "#4ade80",
  ai: "#a855f7",
  personal: "#9ca3af",
  life_design: "#ec4899",
};

const ALL_CATEGORIES = ["engineer", "fitness", "video", "english"];

export default function StatsTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [reviews, setReviews] = useState<WeeklyReviewV2[]>([]);
  const DEFAULT_CATEGORIES = ["engineer", "fitness", "video", "english"];
  const [reviewForm, setReviewForm] = useState<PDCAForm>({
    plan_achievements: DEFAULT_CATEGORIES.map(cat => ({ category: cat, rate: 0, reason: "" })),
    learnings: [""],
    current_state: "",
    next_week_adjustments: [""],
    selected_categories: DEFAULT_CATEGORIES,
  });
  const [saving, setSaving] = useState(false);
  const [showPDCAModal, setShowPDCAModal] = useState(false);

  useEffect(() => {
    fetchData();

    // 日曜日で今週のレビューがなければモーダル表示
    const today = new Date();
    if (today.getDay() === 0) {
      const thisWeek = getThisWeekMonday();
      fetch("/api/v2/reviews?limit=8")
        .then((r) => r.json())
        .catch(() => [])
        .then((reviewList: WeeklyReviewV2[]) => {
          const existing = reviewList.find((rv) => rv.week_start === thisWeek);
          if (!existing) {
            setShowPDCAModal(true);
          }
        });
    }
  }, []);

  const fetchData = async () => {
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
      if (existing && existing.plan_achievements) {
        setReviewForm({
          plan_achievements: existing.plan_achievements,
          learnings: existing.learnings ?? [""],
          current_state: existing.current_state ?? "",
          next_week_adjustments: existing.next_week_adjustments ?? [""],
        });
      }
    });
  };

  const handleSaveReview = async () => {
    setSaving(true);
    try {
      await fetch("/api/v2/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_start: getThisWeekMonday(),
          plan_achievements: reviewForm.plan_achievements,
          learnings: reviewForm.learnings.filter(l => l.trim()),
          current_state: reviewForm.current_state,
          next_week_adjustments: reviewForm.next_week_adjustments.filter(a => a.trim()),
        }),
      });
      await fetchData();
      setShowPDCAModal(false);
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

      {/* PDCA レビューモーダル */}
      {showPDCAModal && (
        <PDCAModal
          form={reviewForm}
          setForm={setReviewForm}
          onSave={handleSaveReview}
          saving={saving}
          onClose={() => setShowPDCAModal(false)}
        />
      )}

      {/* 週次 PDCA レビュー */}
      <section>
        <h3 className="text-yellow-400 text-sm font-semibold mb-3">📝 今週の PDCA レビュー</h3>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-6">
          {/* Plan 達成度 */}
          <div>
            <h4 className="text-cyan-400 text-xs font-semibold mb-3">📊 Plan 達成度（確認対象カテゴリ）</h4>
            {/* カテゴリ選択 */}
            <div className="mb-4 p-3 bg-gray-800 rounded space-y-2">
              <p className="text-xs text-gray-400 mb-2">レビュー対象にするカテゴリを選択：</p>
              <div className="grid grid-cols-2 gap-2">
                {["engineer", "fitness", "video", "english", "investment", "ai", "personal", "life_design"].map(cat => (
                  <label key={cat} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-gray-100">
                    <input
                      type="checkbox"
                      checked={reviewForm.selected_categories?.includes(cat) ?? DEFAULT_CATEGORIES.includes(cat)}
                      onChange={(e) => {
                        const selected = reviewForm.selected_categories ?? DEFAULT_CATEGORIES;
                        const updated = e.target.checked
                          ? [...selected, cat].filter(c => !selected.includes(c) || e.target.checked)
                          : selected.filter(c => c !== cat);
                        const newAchievements = updated.map(c => {
                          const existing = reviewForm.plan_achievements.find(a => a.category === c);
                          return existing || { category: c, rate: 0, reason: "" };
                        });
                        setReviewForm({
                          ...reviewForm,
                          selected_categories: updated,
                          plan_achievements: newAchievements,
                        });
                      }}
                      className="w-4 h-4 rounded"
                    />
                    {CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]}
                  </label>
                ))}
              </div>
            </div>
            {/* 達成度入力 */}
            <div className="space-y-4">
              {reviewForm.plan_achievements.map((item, idx) => {
                const emoji = CATEGORY_EMOJI[item.category] ?? "📌";
                const label = CATEGORY_LABEL[item.category] ?? item.category;
                return (
                  <div key={item.category} className="space-y-2 pb-3 border-b border-gray-700 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{emoji} {label}</span>
                      <span className="text-sm font-bold text-cyan-400">{item.rate}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={item.rate}
                      onChange={(e) => {
                        const updated = [...reviewForm.plan_achievements];
                        updated[idx].rate = Number(e.target.value);
                        setReviewForm({ ...reviewForm, plan_achievements: updated });
                      }}
                      className="w-full accent-cyan-500"
                    />
                    <input
                      type="text"
                      placeholder="理由（なぜこの達成度か）"
                      value={item.reason}
                      onChange={(e) => {
                        const updated = [...reviewForm.plan_achievements];
                        updated[idx].reason = e.target.value;
                        setReviewForm({ ...reviewForm, plan_achievements: updated });
                      }}
                      className="w-full bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 学び */}
          <div>
            <h4 className="text-green-400 text-xs font-semibold mb-3">💡 学び（今週で得た学習や気づき）</h4>
            <div className="space-y-2">
              {reviewForm.learnings.map((learning, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`学び ${idx + 1}`}
                    value={learning}
                    onChange={(e) => {
                      const updated = [...reviewForm.learnings];
                      updated[idx] = e.target.value;
                      setReviewForm({ ...reviewForm, learnings: updated });
                    }}
                    className="flex-1 bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  {reviewForm.learnings.length > 1 && (
                    <button
                      onClick={() => {
                        setReviewForm({
                          ...reviewForm,
                          learnings: reviewForm.learnings.filter((_, i) => i !== idx),
                        });
                      }}
                      className="text-red-400 hover:text-red-300 text-xs px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => {
                  setReviewForm({
                    ...reviewForm,
                    learnings: [...reviewForm.learnings, ""],
                  });
                }}
                className="text-xs text-green-500 hover:text-green-400 mt-1"
              >
                + 学び追加
              </button>
            </div>
          </div>

          {/* 現在地 → 来週の調整 */}
          <div className="space-y-4">
            <div>
              <h4 className="text-indigo-400 text-xs font-semibold mb-2">📍 現在地</h4>
              <textarea
                placeholder="現在の状態・課題を記述"
                value={reviewForm.current_state}
                onChange={(e) => setReviewForm({ ...reviewForm, current_state: e.target.value })}
                rows={2}
                className="w-full bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <h4 className="text-orange-400 text-xs font-semibold mb-3">🎯 来週の調整</h4>
              <div className="space-y-2">
                {reviewForm.next_week_adjustments.map((adj, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`調整 ${idx + 1}`}
                      value={adj}
                      onChange={(e) => {
                        const updated = [...reviewForm.next_week_adjustments];
                        updated[idx] = e.target.value;
                        setReviewForm({ ...reviewForm, next_week_adjustments: updated });
                      }}
                      className="flex-1 bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    {reviewForm.next_week_adjustments.length > 1 && (
                      <button
                        onClick={() => {
                          setReviewForm({
                            ...reviewForm,
                            next_week_adjustments: reviewForm.next_week_adjustments.filter(
                              (_, i) => i !== idx
                            ),
                          });
                        }}
                        className="text-red-400 hover:text-red-300 text-xs px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    setReviewForm({
                      ...reviewForm,
                      next_week_adjustments: [...reviewForm.next_week_adjustments, ""],
                    });
                  }}
                  className="text-xs text-orange-500 hover:text-orange-400 mt-1"
                >
                  + 調整追加
                </button>
              </div>
            </div>
          </div>

          {/* 保存ボタン */}
          <button
            onClick={handleSaveReview}
            disabled={saving}
            className="w-full py-2 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "保存中..." : "PDCA レビューを保存"}
          </button>
        </div>
      </section>

      {/* 過去のレビュー履歴 */}
      {reviews.length > 0 && (
        <section>
          <h3 className="text-gray-500 text-xs font-semibold mb-3">📚 過去の PDCA レビュー履歴</h3>
          <div className="space-y-3">
            {reviews.slice(0, 8).map((r) => (
              <details
                key={r.id}
                className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 cursor-pointer hover:border-gray-700"
              >
                <summary className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">{formatWeekLabel(r.week_start)} の週</span>
                  {r.plan_achievements && r.plan_achievements.length > 0 && (
                    <span className="text-gray-500">
                      {Math.round(
                        r.plan_achievements.reduce((sum, a) => sum + a.rate, 0) /
                          r.plan_achievements.length
                      )}% 平均達成度
                    </span>
                  )}
                </summary>
                <div className="text-xs text-gray-400 mt-2 space-y-2 pl-2 border-l border-gray-700">
                  {r.plan_achievements && r.plan_achievements.length > 0 && (
                    <div>
                      <span className="text-cyan-400 font-semibold">達成度:</span>
                      <div className="ml-2 mt-1 space-y-1">
                        {r.plan_achievements
                          .filter((a) => a.rate > 0)
                          .map((a) => {
                            const label = CATEGORY_LABEL[a.category] ?? a.category;
                            return (
                            <div key={a.category}>
                              {CATEGORY_EMOJI[a.category]} {label}: {a.rate}%
                              {a.reason && <span className="text-gray-600"> ({a.reason})</span>}
                            </div>
                          );
                          })}
                      </div>
                    </div>
                  )}
                  {r.learnings && r.learnings.length > 0 && (
                    <div>
                      <span className="text-green-400 font-semibold">学び:</span>
                      <div className="ml-2 mt-1 space-y-1">
                        {r.learnings.map((l, i) => (
                          <div key={i}>• {l}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {r.current_state && (
                    <div>
                      <span className="text-indigo-400 font-semibold">現在地:</span>
                      <div className="ml-2 mt-1">{r.current_state}</div>
                    </div>
                  )}
                  {r.next_week_adjustments && r.next_week_adjustments.length > 0 && (
                    <div>
                      <span className="text-orange-400 font-semibold">来週の調整:</span>
                      <div className="ml-2 mt-1 space-y-1">
                        {r.next_week_adjustments.map((a, i) => (
                          <div key={i}>→ {a}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// PDCA モーダルコンポーネント
interface PDCAModalProps {
  form: PDCAForm;
  setForm: (form: PDCAForm) => void;
  onSave: () => void;
  saving: boolean;
  onClose: () => void;
}

function PDCAModal({ form, setForm, onSave, saving, onClose }: PDCAModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-yellow-400 text-lg font-bold">📝 今週のPDCAレビュー</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl">
            ✕
          </button>
        </div>

        {/* Plan 達成度 */}
        <div className="space-y-2">
          <h3 className="text-cyan-400 text-sm font-semibold">📊 Plan 達成度（各カテゴリ）</h3>
          <div className="space-y-3 bg-gray-800 rounded p-3">
            {form.plan_achievements.map((item, idx) => {
              const emoji = CATEGORY_EMOJI[item.category] ?? "📌";
              const label = CATEGORY_LABEL[item.category] ?? item.category;
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">{emoji} {label}</span>
                    <span className="text-xs font-bold text-cyan-400">{item.rate}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={item.rate}
                    onChange={(e) => {
                      const updated = [...form.plan_achievements];
                      updated[idx].rate = Number(e.target.value);
                      setForm({ ...form, plan_achievements: updated });
                    }}
                    className="w-full accent-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="理由"
                    value={item.reason}
                    onChange={(e) => {
                      const updated = [...form.plan_achievements];
                      updated[idx].reason = e.target.value;
                      setForm({ ...form, plan_achievements: updated });
                    }}
                    className="w-full bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 学び */}
        <div className="space-y-2">
          <h3 className="text-green-400 text-sm font-semibold">💡 学び</h3>
          <div className="space-y-2 bg-gray-800 rounded p-3">
            {form.learnings.map((learning, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  placeholder="学び"
                  value={learning}
                  onChange={(e) => {
                    const updated = [...form.learnings];
                    updated[idx] = e.target.value;
                    setForm({ ...form, learnings: updated });
                  }}
                  className="flex-1 bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                {form.learnings.length > 1 && (
                  <button
                    onClick={() => {
                      setForm({
                        ...form,
                        learnings: form.learnings.filter((_, i) => i !== idx),
                      });
                    }}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                setForm({ ...form, learnings: [...form.learnings, ""] });
              }}
              className="text-xs text-green-500 hover:text-green-400"
            >
              + 追加
            </button>
          </div>
        </div>

        {/* 現在地 → 来週の調整 */}
        <div className="space-y-2">
          <h3 className="text-indigo-400 text-sm font-semibold">📍 現在地</h3>
          <textarea
            placeholder="現在の状態・課題"
            value={form.current_state}
            onChange={(e) => setForm({ ...form, current_state: e.target.value })}
            rows={2}
            className="w-full bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-orange-400 text-sm font-semibold">🎯 来週の調整</h3>
          <div className="space-y-2 bg-gray-800 rounded p-3">
            {form.next_week_adjustments.map((adj, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  placeholder="調整"
                  value={adj}
                  onChange={(e) => {
                    const updated = [...form.next_week_adjustments];
                    updated[idx] = e.target.value;
                    setForm({ ...form, next_week_adjustments: updated });
                  }}
                  className="flex-1 bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                {form.next_week_adjustments.length > 1 && (
                  <button
                    onClick={() => {
                      setForm({
                        ...form,
                        next_week_adjustments: form.next_week_adjustments.filter(
                          (_, i) => i !== idx
                        ),
                      });
                    }}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                setForm({
                  ...form,
                  next_week_adjustments: [...form.next_week_adjustments, ""],
                });
              }}
              className="text-xs text-orange-500 hover:text-orange-400"
            >
              + 追加
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-2 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
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
