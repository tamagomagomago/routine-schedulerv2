"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GoalV2, CreateGoalV2, TodoV2,
  CATEGORY_EMOJI, CATEGORY_LABEL, CATEGORY_COLOR, PRIORITY_LABEL, PRIORITY_COLOR,
} from "@/types/v2";

const CATEGORIES = ["video", "english", "investment", "ai", "personal"];
const TODAY = new Date().toISOString().split("T")[0];
const THIS_YEAR = new Date().getFullYear();

function getThisWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

export default function GoalsTab() {
  const [goals, setGoals] = useState<GoalV2[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<GoalV2 | null>(null);
  const [showLastMonth, setShowLastMonth] = useState(false);
  const [openAnnual, setOpenAnnual] = useState(true);
  const [openMonthly, setOpenMonthly] = useState(true);
  const [openWeekly, setOpenWeekly] = useState(true);
  const [form, setForm] = useState<CreateGoalV2 & { current_value?: number }>({
    title: "",
    category: "personal",
    period_type: "annual",
    parent_id: null,
    target_value: undefined,
    current_value: 0,
    unit: "",
    start_date: TODAY,
    end_date: `${THIS_YEAR}-12-31`,
  });

  // 月初セットアップモーダル
  const [showMonthlySetup, setShowMonthlySetup] = useState(false);
  const [monthlySetupStep, setMonthlySetupStep] = useState<"monthly" | "weekly">("monthly");
  const [monthlyGoalForm, setMonthlyGoalForm] = useState({ title: "", category: "personal", target_value: "", unit: "" });
  const [weeklyGoalsForm, setWeeklyGoalsForm] = useState<Array<{ week: number; title: string; category: string; target_value: string; unit: string }>>([]);
  const [savingMonthlySetup, setSavingMonthlySetup] = useState(false);

  const fetchData = useCallback(async () => {
    const goalsRes = await fetch("/api/v2/goals");
    if (goalsRes.ok) setGoals(await goalsRes.json());
  }, []);

  useEffect(() => {
    fetchData();

    // 初期化時に年間目標を自動追加（存在しない場合）
    const addInitialAnnualGoals = async () => {
      const res = await fetch("/api/v2/goals");
      if (res.ok) {
        const goals = await res.json();
        const annualCount = goals?.filter((g: any) => g.period_type === "annual")?.length ?? 0;

        if (annualCount === 0) {
          const defaultGoals = [
            { title: "サイドファイアに向けた投資増強", category: "investment", period_type: "annual", target_value: 1500, unit: "万円", current_value: 1000, start_date: "2026-01-01", end_date: "2026-12-31" },
            { title: "IELTS Speaking 5.5達成", category: "english", period_type: "annual", target_value: 800, unit: "TOEIC換算点", current_value: 650, start_date: "2026-01-01", end_date: "2026-10-31" },
            { title: "Instagram フォロワー10,000人", category: "vfx", period_type: "annual", target_value: 10000, unit: "フォロワー", current_value: 12, start_date: "2026-01-01", end_date: "2026-10-31" },
            { title: "ベンチプレス100kg達成", category: "fitness", period_type: "annual", target_value: 100, unit: "kg", current_value: 85, start_date: "2026-01-01", end_date: "2026-04-30" },
            { title: "技術士二次試験合格", category: "engineer", period_type: "annual", target_value: 135, unit: "h", current_value: 0, start_date: "2026-01-01", end_date: "2026-07-20" },
          ];

          for (const goal of defaultGoals) {
            await fetch("/api/v2/goals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(goal),
            });
          }

          fetchData();
        }
      }
    };

    addInitialAnnualGoals();
  }, [fetchData]);

  // 月初1日に月間・週間目標セットアップモーダルを表示
  useEffect(() => {
    const today = new Date();
    const monthlyGoalsInFetch = goals.filter((g) => g.period_type === "monthly");
    const thisMonthKeyCheck = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthGoalsCheck = monthlyGoalsInFetch.filter((g) => {
      const s = g.start_date.slice(0, 7);
      const e = g.end_date.slice(0, 7);
      return s <= thisMonthKeyCheck && e >= thisMonthKeyCheck;
    });

    if (today.getDate() === 1 && thisMonthGoalsCheck.length === 0 && !showMonthlySetup) {
      setShowMonthlySetup(true);
      setMonthlySetupStep("monthly");

      // 初期週間目標フォームを生成（4週分）
      const weeklyGoals = [];
      for (let i = 1; i <= 4; i++) {
        weeklyGoals.push({ week: i, title: "", category: "personal", target_value: "", unit: "" });
      }
      setWeeklyGoalsForm(weeklyGoals);

      // ブラウザ通知も表示
      if ("Notification" in window) {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            new Notification("📌 今月の目標を設定しましょう！", {
              body: "月初のセットアップモーダルが開きました。今月の目標と週間目標を設定してください。",
            });
          }
        });
      }
    }
  }, [goals, showMonthlySetup]);

  // 日付計算
  const todayDate = new Date();
  const dayOfMonth = todayDate.getDate();
  const thisMonthKey = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const annualGoals = goals.filter((g) => g.period_type === "annual");
  const monthlyGoals = goals.filter((g) => g.period_type === "monthly");
  const weeklyGoals = goals.filter((g) => g.period_type === "weekly");

  const thisMonthGoals = monthlyGoals.filter((g) => {
    const s = g.start_date.slice(0, 7);
    const e = g.end_date.slice(0, 7);
    return s <= thisMonthKey && e >= thisMonthKey;
  });
  const lastMonthGoals = monthlyGoals.filter((g) => {
    const s = g.start_date.slice(0, 7);
    const e = g.end_date.slice(0, 7);
    return s <= lastMonthKey && e >= lastMonthKey;
  });
  const { start: weekStart, end: weekEnd } = getThisWeekRange();
  const thisWeekGoals = weeklyGoals.filter(
    (g) => g.start_date <= weekEnd && g.end_date >= weekStart
  );

  // 月初1〜5日かつ今月の目標がない場合にリマインダー表示
  const showMonthlyReminder = dayOfMonth <= 5 && thisMonthGoals.length === 0;

  const openCreate = (periodType?: GoalV2["period_type"], parentId?: number) => {
    const defaults = getDateDefaults(periodType ?? "annual");
    setEditGoal(null);
    setShowLastMonth(false);
    setForm({
      title: "",
      category: "personal",
      period_type: periodType ?? "annual",
      parent_id: parentId ?? null,
      target_value: undefined,
      current_value: 0,
      unit: "",
      ...defaults,
    });
    setShowModal(true);
  };

  const openEdit = (goal: GoalV2) => {
    setEditGoal(goal);
    setShowLastMonth(false);
    setForm({
      title: goal.title,
      category: goal.category,
      period_type: goal.period_type,
      parent_id: goal.parent_id ?? null,
      target_value: goal.target_value ?? undefined,
      current_value: goal.current_value,
      unit: goal.unit ?? "",
      start_date: goal.start_date,
      end_date: goal.end_date,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    const url = editGoal ? `/api/v2/goals/${editGoal.id}` : "/api/v2/goals";
    const method = editGoal ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, current_value: form.current_value ?? 0, parent_id: null }),
    });
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/v2/goals/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleProgress = async (goal: GoalV2, delta: number) => {
    const newVal = Math.max(0, goal.current_value + delta);
    const isAchieved = goal.target_value ? newVal >= goal.target_value : false;
    await fetch(`/api/v2/goals/${goal.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_value: newVal, is_achieved: isAchieved }),
    });
    fetchData();
  };


  const getMonthlyDateRange = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    return {
      start: `${year}-${String(month + 1).padStart(2, "0")}-01`,
      end: new Date(year, month + 1, 0).toISOString().split("T")[0],
    };
  };

  const getWeekDates = (weekNumber: number) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const monthStart = new Date(year, month, 1);
    const firstMondayOffset = (1 - monthStart.getDay() + 7) % 7 || 7;
    const weekStart = new Date(year, month, 1 + firstMondayOffset + (weekNumber - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return {
      start: weekStart.toISOString().split("T")[0],
      end: weekEnd.toISOString().split("T")[0],
    };
  };

  const handleSaveMonthlySetup = async () => {
    if (!monthlyGoalForm.title.trim()) return;
    setSavingMonthlySetup(true);

    try {
      const dateRange = getMonthlyDateRange();

      // 月間目標を作成
      const monthlyGoalRes = await fetch("/api/v2/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: monthlyGoalForm.title,
          category: monthlyGoalForm.category,
          period_type: "monthly",
          parent_id: null,
          target_value: monthlyGoalForm.target_value ? Number(monthlyGoalForm.target_value) : undefined,
          current_value: 0,
          unit: monthlyGoalForm.unit || "",
          start_date: dateRange.start,
          end_date: dateRange.end,
        }),
      });

      let monthlyGoalId = null;
      if (monthlyGoalRes.ok) {
        const data = await monthlyGoalRes.json();
        monthlyGoalId = data.id;
      }

      // 週間目標を作成
      for (const week of weeklyGoalsForm) {
        if (week.title.trim()) {
          const weekDates = getWeekDates(week.week);
          await fetch("/api/v2/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: week.title,
              category: week.category,
              period_type: "weekly",
              parent_id: monthlyGoalId || null,
              target_value: week.target_value ? Number(week.target_value) : undefined,
              current_value: 0,
              unit: week.unit || "",
              start_date: weekDates.start,
              end_date: weekDates.end,
            }),
          });
        }
      }

      setShowMonthlySetup(false);
      setMonthlyGoalForm({ title: "", category: "personal", target_value: "", unit: "" });
      setWeeklyGoalsForm([]);
      fetchGoals();
    } finally {
      setSavingMonthlySetup(false);
    }
  };

  return (
    <div className="pb-24 px-4 pt-4 space-y-5">

      {/* 月初リマインダー */}
      {showMonthlyReminder && (
        <div className="bg-yellow-900/40 border border-yellow-700 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-xl shrink-0">📌</span>
          <div className="flex-1">
            <p className="text-yellow-300 text-sm font-semibold">今月の目標をまだ設定していません</p>
            <p className="text-yellow-500 text-xs mt-0.5">先月の目標を参考に「＋追加」から今月の目標を設定しましょう。</p>
          </div>
          <button
            onClick={() => openCreate("monthly")}
            className="shrink-0 text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg"
          >
            設定する
          </button>
        </div>
      )}

      {/* 年間目標 */}
      <Section
        title="📊 年間目標"
        bgColor="bg-purple-950/40"
        borderColor="border-purple-700"
        goals={annualGoals}
        onEdit={openEdit}
        onDelete={handleDelete}
        onProgress={handleProgress}
        onAdd={() => openCreate("annual")}
        open={openAnnual}
        onToggle={() => setOpenAnnual(!openAnnual)}
      />

      {/* 今月の目標 */}
      <Section
        title="📌 今月の目標"
        bgColor="bg-blue-950/40"
        borderColor="border-blue-700"
        goals={thisMonthGoals}
        allGoals={monthlyGoals}
        parentGoals={annualGoals}
        onEdit={openEdit}
        onDelete={handleDelete}
        onProgress={handleProgress}
        onAdd={() => openCreate("monthly")}
        emptyText="今月の目標がありません"
        open={openMonthly}
        onToggle={() => setOpenMonthly(!openMonthly)}
      />

      {/* 今週の目標 */}
      <Section
        title="📅 今週の目標"
        bgColor="bg-green-950/40"
        borderColor="border-green-700"
        goals={thisWeekGoals}
        allGoals={weeklyGoals}
        parentGoals={monthlyGoals}
        onEdit={openEdit}
        onDelete={handleDelete}
        onProgress={handleProgress}
        onAdd={() => openCreate("weekly")}
        emptyText="今週の目標がありません"
        open={openWeekly}
        onToggle={() => setOpenWeekly(!openWeekly)}
      />

      {/* 目標 作成/編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">{editGoal ? "目標を編集" : "目標を追加"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>

            <input
              placeholder="目標タイトル *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">カテゴリ</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">期間タイプ</label>
                <select value={form.period_type} onChange={(e) => {
                  const pt = e.target.value as GoalV2["period_type"];
                  setForm({ ...form, period_type: pt, ...getDateDefaults(pt) });
                }} className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-sm">
                  <option value="annual">年間</option>
                  <option value="monthly">月間</option>
                  <option value="weekly">週間</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">現在値</label>
                <input type="number" placeholder="0"
                  value={form.current_value ?? 0}
                  onChange={(e) => setForm({ ...form, current_value: Number(e.target.value) })}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">目標値</label>
                <input type="number" placeholder="100"
                  value={form.target_value ?? ""}
                  onChange={(e) => setForm({ ...form, target_value: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">単位</label>
                <input placeholder="kg, 回, ..."
                  value={form.unit ?? ""}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">開始日</label>
                <input type="date" value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">終了日</label>
                <input type="date" value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-sm" />
              </div>
            </div>

            {/* 月間目標追加時：先月の目標を参考表示 */}
            {form.period_type === "monthly" && lastMonthGoals.length > 0 && (
              <div className="border border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowLastMonth((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 text-xs text-gray-400 hover:text-gray-200"
                >
                  <span>📎 先月の目標を参考にする（{lastMonthGoals.length}件）</span>
                  <span>{showLastMonth ? "▲" : "▼"}</span>
                </button>
                {showLastMonth && (
                  <div className="p-3 space-y-2 bg-gray-850">
                    {lastMonthGoals.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 rounded-lg px-2 py-1.5 transition-colors"
                        onClick={() => setForm((f) => ({ ...f, title: g.title, category: g.category, target_value: g.target_value ?? undefined, unit: g.unit ?? "" }))}
                      >
                        <span className="text-sm">{CATEGORY_EMOJI[g.category] ?? "📌"}</span>
                        <p className="flex-1 text-xs text-gray-300 truncate">{g.title}</p>
                        {g.target_value && (
                          <span className="text-xs text-gray-500">{g.target_value}{g.unit}</span>
                        )}
                        <span className="text-xs text-blue-400 shrink-0">↑ 使う</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleSubmit}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                {editGoal ? "保存" : "追加"}
              </button>
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 月初セットアップモーダル */}
      {showMonthlySetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gradient-to-br from-blue-950/60 via-gray-900 to-gray-900 border border-blue-700/50 rounded-2xl w-full max-w-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📅</span>
                <div>
                  <h2 className="text-white font-bold text-xl">今月の目標をセットアップ</h2>
                  <p className="text-blue-300 text-xs mt-0.5">月間目標と各週の週間目標を設定しましょう</p>
                </div>
              </div>
              <button onClick={() => setShowMonthlySetup(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>

            {/* ステップインジケーター */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${monthlySetupStep === "monthly" ? "bg-blue-600 text-white" : "bg-blue-900/40 text-blue-300"}`}>
                1
              </div>
              <div className={`flex-1 h-1 ${monthlySetupStep === "weekly" ? "bg-blue-600" : "bg-gray-700"}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${monthlySetupStep === "weekly" ? "bg-blue-600 text-white" : "bg-blue-900/40 text-blue-300"}`}>
                2
              </div>
            </div>

            {/* ステップ1: 月間目標 */}
            {monthlySetupStep === "monthly" && (
              <div className="space-y-4">
                <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4">
                  <p className="text-blue-300 text-sm font-medium mb-3">📌 ステップ1: 月間目標を設定</p>
                  <p className="text-gray-400 text-xs mb-4">今月の主な目標を1つ設定してください。複数設定する場合は後で追加できます。</p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">目標タイトル *</label>
                      <input type="text" placeholder="例：技術ブログ5本投稿"
                        value={monthlyGoalForm.title}
                        onChange={(e) => setMonthlyGoalForm({ ...monthlyGoalForm, title: e.target.value })}
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">カテゴリ</label>
                        <select value={monthlyGoalForm.category} onChange={(e) => setMonthlyGoalForm({ ...monthlyGoalForm, category: e.target.value })}
                          className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-xs">
                          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">目標値</label>
                        <input type="number" placeholder="5"
                          value={monthlyGoalForm.target_value}
                          onChange={(e) => setMonthlyGoalForm({ ...monthlyGoalForm, target_value: e.target.value })}
                          className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-xs" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">単位</label>
                        <input type="text" placeholder="本"
                          value={monthlyGoalForm.unit}
                          onChange={(e) => setMonthlyGoalForm({ ...monthlyGoalForm, unit: e.target.value })}
                          className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-xs" />
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={() => setMonthlySetupStep("weekly")}
                  disabled={!monthlyGoalForm.title.trim()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  ▶ ステップ2へ（週間目標を設定）
                </button>
              </div>
            )}

            {/* ステップ2: 週間目標 */}
            {monthlySetupStep === "weekly" && (
              <div className="space-y-4">
                <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-4">
                  <p className="text-green-300 text-sm font-medium mb-3">📅 ステップ2: 週間目標を設定（オプション）</p>
                  <p className="text-gray-400 text-xs mb-4">各週の小目標を設定します。空白でも構いません。</p>

                  <div className="space-y-3">
                    {weeklyGoalsForm.map((week, idx) => (
                      <div key={week.week} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-gray-300">📌 第{week.week}週</label>
                          <span className="text-xs text-gray-600">{getWeekDates(week.week).start} 〜 {getWeekDates(week.week).end}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="週の目標"
                            value={week.title}
                            onChange={(e) => {
                              const updated = [...weeklyGoalsForm];
                              updated[idx].title = e.target.value;
                              setWeeklyGoalsForm(updated);
                            }}
                            className="col-span-2 bg-gray-700 text-white rounded px-2 py-1.5 text-xs" />
                          <select value={week.category} onChange={(e) => {
                            const updated = [...weeklyGoalsForm];
                            updated[idx].category = e.target.value;
                            setWeeklyGoalsForm(updated);
                          }} className="bg-gray-700 text-white rounded px-1.5 py-1.5 text-xs">
                            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_EMOJI[c]}</option>)}
                          </select>
                          <input type="text" placeholder="目標値"
                            value={week.target_value}
                            onChange={(e) => {
                              const updated = [...weeklyGoalsForm];
                              updated[idx].target_value = e.target.value;
                              setWeeklyGoalsForm(updated);
                            }}
                            className="bg-gray-700 text-white rounded px-1.5 py-1.5 text-xs" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setMonthlySetupStep("monthly")}
                    className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                    ◀ 戻る
                  </button>
                  <button onClick={handleSaveMonthlySetup}
                    disabled={savingMonthlySetup || !monthlyGoalForm.title.trim()}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                    {savingMonthlySetup ? "保存中..." : "✓ 保存して完了"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title, bgColor, borderColor, goals, allGoals, parentGoals, onEdit, onDelete, onProgress, onAdd, emptyText, open, onToggle,
}: {
  title: string;
  bgColor: string;
  borderColor: string;
  goals: GoalV2[];
  allGoals?: GoalV2[];
  parentGoals?: GoalV2[];
  onEdit: (g: GoalV2) => void;
  onDelete: (id: number) => void;
  onProgress: (g: GoalV2, delta: number) => void;
  onAdd: () => void;
  emptyText?: string;
  open: boolean;
  onToggle: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayGoals = showAll ? (allGoals ?? goals) : goals;

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/20 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 text-left">
          <p className="text-sm font-semibold text-gray-100">{title}</p>
          <span className="text-xs text-gray-500">({displayGoals.length})</span>
          {allGoals && allGoals.length > goals.length && !showAll && (
            <span className="text-xs text-gray-600">他{allGoals.length - goals.length}件</span>
          )}
        </div>
        <span className="text-gray-400">{open ? "▼" : "▶"}</span>
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-3 border-t border-black/30">
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {allGoals && allGoals.length > goals.length && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-0.5 rounded transition-colors"
                >
                  {showAll ? "今期のみ" : `全${allGoals.length}件`}
                </button>
              )}
            </div>
            <button onClick={onAdd} className="text-xs text-gray-400 hover:text-white border border-gray-700 px-2 py-0.5 rounded transition-colors">
              + 追加
            </button>
          </div>

          {displayGoals.length === 0 ? (
            <p className="text-gray-700 text-xs text-center py-3">{emptyText ?? "目標がありません"}</p>
          ) : (
            <div className="space-y-2">
              {displayGoals.map((goal) => {
                const parent = parentGoals?.find((p) => p.id === goal.parent_id);
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    parentLabel={parent ? `${CATEGORY_EMOJI[parent.category] ?? ""} ${parent.title}` : undefined}
                    onEdit={() => onEdit(goal)}
                    onDelete={() => onDelete(goal.id)}
                    onProgress={(d) => onProgress(goal, d)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, parentLabel, onEdit, onDelete, onProgress }: {
  goal: GoalV2;
  parentLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
  onProgress: (delta: number) => void;
}) {
  const progress = goal.target_value ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)) : 0;
  const barColor = goal.is_achieved ? "bg-green-500" : progress >= 60 ? "bg-blue-500" : progress >= 30 ? "bg-yellow-500" : "bg-red-500";
  const catColor = CATEGORY_COLOR[goal.category] ?? CATEGORY_COLOR.personal;
  const daysLeft = Math.ceil((new Date(goal.end_date).getTime() - Date.now()) / 86400000);

  return (
    <div className={`bg-gray-900 border rounded-xl p-3 ${goal.is_achieved ? "border-green-800 opacity-70" : "border-gray-800"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span>{CATEGORY_EMOJI[goal.category] ?? "📌"}</span>
            <p className="text-sm font-medium text-gray-100 truncate">{goal.title}</p>
            {goal.is_achieved && <span className="text-green-400 text-xs shrink-0">✓達成</span>}
          </div>
          {parentLabel && <p className="text-xs text-gray-600 truncate ml-5">↑ {parentLabel}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="text-gray-600 hover:text-gray-300 text-xs px-1">✏</button>
          <button onClick={onDelete} className="text-gray-700 hover:text-red-500 text-xs px-1">✕</button>
        </div>
      </div>

      {goal.target_value && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{goal.current_value} / {goal.target_value} {goal.unit}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded border ${catColor}`}>{CATEGORY_LABEL[goal.category]}</span>
          {daysLeft > 0 ? (
            <span className="text-xs text-gray-600">残{daysLeft}日</span>
          ) : (
            <span className="text-xs text-red-500">期限切れ</span>
          )}
        </div>
        {goal.target_value && !goal.is_achieved && (
          <div className="flex items-center gap-1">
            <button onClick={() => onProgress(-1)} className="w-6 h-6 rounded bg-gray-800 text-gray-400 hover:text-white text-xs flex items-center justify-center">−</button>
            <button onClick={() => onProgress(1)} className="w-6 h-6 rounded bg-gray-800 text-gray-400 hover:text-white text-xs flex items-center justify-center">+</button>
          </div>
        )}
      </div>
    </div>
  );
}

function getDateDefaults(periodType: GoalV2["period_type"]) {
  const today = new Date();
  if (periodType === "annual") {
    return {
      start_date: `${today.getFullYear()}-01-01`,
      end_date: `${today.getFullYear()}-12-31`,
    };
  }
  if (periodType === "monthly") {
    const y = today.getFullYear(), m = today.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    return {
      start_date: `${y}-${String(m + 1).padStart(2, "0")}-01`,
      end_date: `${y}-${String(m + 1).padStart(2, "0")}-${last}`,
    };
  }
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start_date: monday.toISOString().split("T")[0],
    end_date: sunday.toISOString().split("T")[0],
  };
}
