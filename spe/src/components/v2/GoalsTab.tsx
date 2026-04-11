"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GoalV2, CreateGoalV2, TodoV2,
  CATEGORY_EMOJI, CATEGORY_COLOR, PRIORITY_LABEL, PRIORITY_COLOR,
} from "@/types/v2";

const CATEGORIES = ["vfx", "english", "engineer", "investment", "fitness", "personal"];
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
  const [otherTodos, setOtherTodos] = useState<TodoV2[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<GoalV2 | null>(null);
  const [showLastMonth, setShowLastMonth] = useState(false);
  const [form, setForm] = useState<CreateGoalV2>({
    title: "",
    category: "personal",
    period_type: "annual",
    parent_id: null,
    target_value: undefined,
    unit: "",
    start_date: TODAY,
    end_date: `${THIS_YEAR}-12-31`,
  });

  // その他タスク フォーム
  const [showOtherForm, setShowOtherForm] = useState(false);
  const [otherForm, setOtherForm] = useState({ title: "", category: "personal", estimated_minutes: 30 });
  const [savingOther, setSavingOther] = useState(false);

  const fetchGoals = useCallback(async () => {
    const res = await fetch("/api/v2/goals");
    if (res.ok) setGoals(await res.json());
  }, []);

  const fetchOtherTodos = useCallback(async () => {
    const res = await fetch("/api/v2/todos");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        // goal_id なし かつ scheduled_date なし = 純粋な「その他タスク」
        setOtherTodos(data.filter((t: TodoV2) => t.goal_id == null && t.scheduled_date == null));
      }
    }
  }, []);

  useEffect(() => {
    fetchGoals();
    fetchOtherTodos();

    // 月初1日に通知
    const today = new Date();
    if (today.getDate() === 1 && "Notification" in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification("📌 今月の目標を設定しましょう！", {
            body: "先月の目標を参考に、今月の目標を設定してください。",
          });
        }
      });
    }
  }, [fetchGoals, fetchOtherTodos]);

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
      body: JSON.stringify({ ...form, current_value: editGoal?.current_value ?? 0, parent_id: null }),
    });
    setShowModal(false);
    fetchGoals();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/v2/goals/${id}`, { method: "DELETE" });
    fetchGoals();
  };

  const handleProgress = async (goal: GoalV2, delta: number) => {
    const newVal = Math.max(0, goal.current_value + delta);
    const isAchieved = goal.target_value ? newVal >= goal.target_value : false;
    await fetch(`/api/v2/goals/${goal.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_value: newVal, is_achieved: isAchieved }),
    });
    fetchGoals();
  };

  const handleAddOtherTodo = async () => {
    if (!otherForm.title.trim()) return;
    setSavingOther(true);
    await fetch("/api/v2/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: otherForm.title,
        category: otherForm.category,
        priority: 3,
        estimated_minutes: otherForm.estimated_minutes,
        goal_id: null,
      }),
    });
    setOtherForm({ title: "", category: "personal", estimated_minutes: 30 });
    setShowOtherForm(false);
    setSavingOther(false);
    fetchOtherTodos();
  };

  const handleCompleteOtherTodo = async (id: number) => {
    await fetch(`/api/v2/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_completed: true }),
    });
    fetchOtherTodos();
  };

  const handleDeleteOtherTodo = async (id: number) => {
    await fetch(`/api/v2/todos/${id}`, { method: "DELETE" });
    fetchOtherTodos();
  };

  const handleMoveToToday = async (id: number) => {
    await fetch(`/api/v2/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_date: TODAY }),
    });
    fetchOtherTodos();
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
        color="text-purple-400"
        goals={annualGoals}
        onEdit={openEdit}
        onDelete={handleDelete}
        onProgress={handleProgress}
        onAdd={() => openCreate("annual")}
      />

      {/* 今月の目標 */}
      <Section
        title="📌 今月の目標"
        color="text-blue-400"
        goals={thisMonthGoals}
        allGoals={monthlyGoals}
        parentGoals={annualGoals}
        onEdit={openEdit}
        onDelete={handleDelete}
        onProgress={handleProgress}
        onAdd={() => openCreate("monthly")}
        emptyText="今月の目標がありません"
      />

      {/* 今週の目標 */}
      <Section
        title="📅 今週の目標"
        color="text-green-400"
        goals={thisWeekGoals}
        allGoals={weeklyGoals}
        parentGoals={monthlyGoals}
        onEdit={openEdit}
        onDelete={handleDelete}
        onProgress={handleProgress}
        onAdd={() => openCreate("weekly")}
        emptyText="今週の目標がありません"
      />

      {/* その他タスク */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-400">📋 その他タスク</p>
          <button
            onClick={() => setShowOtherForm((v) => !v)}
            className="text-xs text-gray-500 hover:text-white border border-gray-700 px-2 py-0.5 rounded transition-colors"
          >
            + 追加
          </button>
        </div>

        {showOtherForm && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 mb-2 space-y-2">
            <input
              placeholder="タスク名 *"
              value={otherForm.title}
              onChange={(e) => setOtherForm({ ...otherForm, title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAddOtherTodo()}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2 items-center">
              <select
                value={otherForm.category}
                onChange={(e) => setOtherForm({ ...otherForm, category: e.target.value })}
                className="flex-1 bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>
                ))}
              </select>
              <input
                type="number"
                value={otherForm.estimated_minutes}
                onChange={(e) => setOtherForm({ ...otherForm, estimated_minutes: Number(e.target.value) })}
                min={5} step={5}
                className="w-20 bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
              />
              <span className="text-xs text-gray-500">分</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddOtherTodo}
                disabled={savingOther || !otherForm.title.trim()}
                className="flex-1 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
              >
                追加
              </button>
              <button
                onClick={() => setShowOtherForm(false)}
                className="py-1.5 px-3 bg-gray-700 text-gray-400 rounded-lg text-xs"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {otherTodos.length === 0 ? (
          <p className="text-gray-700 text-xs text-center py-3">その他タスクはありません</p>
        ) : (
          <div className="space-y-1.5">
            {otherTodos.map((todo) => (
              <div key={todo.id} className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
                <button
                  onClick={() => handleCompleteOtherTodo(todo.id)}
                  className="w-4 h-4 rounded-full border border-gray-600 hover:border-blue-500 shrink-0 transition-colors"
                />
                <span className="text-sm">{CATEGORY_EMOJI[todo.category] ?? "📌"}</span>
                <p className="flex-1 text-sm text-gray-200 truncate">{todo.title}</p>
                <span className="text-xs text-gray-600 shrink-0">⏱{todo.estimated_minutes}分</span>
                <button
                  onClick={() => handleMoveToToday(todo.id)}
                  className="shrink-0 text-xs px-2 py-0.5 rounded border border-blue-700 text-blue-400 hover:bg-blue-900/40 transition-colors"
                  title="今日のTODOに移動"
                >📅 今日へ</button>
                <button
                  onClick={() => handleDeleteOtherTodo(todo.id)}
                  className="text-gray-700 hover:text-red-500 text-xs shrink-0"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

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
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
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
                  value={editGoal?.current_value ?? 0}
                  onChange={(e) => {
                    if (editGoal) setEditGoal({ ...editGoal, current_value: Number(e.target.value) });
                  }}
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
    </div>
  );
}

function Section({
  title, color, goals, allGoals, parentGoals, onEdit, onDelete, onProgress, onAdd, emptyText,
}: {
  title: string;
  color: string;
  goals: GoalV2[];
  allGoals?: GoalV2[];
  parentGoals?: GoalV2[];
  onEdit: (g: GoalV2) => void;
  onDelete: (id: number) => void;
  onProgress: (g: GoalV2, delta: number) => void;
  onAdd: () => void;
  emptyText?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayGoals = showAll ? (allGoals ?? goals) : goals;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${color}`}>{title}</p>
          {allGoals && allGoals.length > goals.length && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-gray-600 hover:text-gray-400 underline"
            >
              {showAll ? "今期のみ" : `全${allGoals.length}件`}
            </button>
          )}
        </div>
        <button onClick={onAdd} className="text-xs text-gray-500 hover:text-white border border-gray-700 px-2 py-0.5 rounded transition-colors">
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
          <span className={`text-xs px-1.5 py-0.5 rounded border ${catColor}`}>{goal.category}</span>
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
