"use client";

import { useState, useEffect, useCallback } from "react";
import { TodoV2, CreateTodoV2, GoalV2, CATEGORY_EMOJI, CATEGORY_LABEL, CATEGORY_COLOR, PRIORITY_COLOR, PRIORITY_LABEL } from "@/types/v2";

const TODAY = new Date().toISOString().split("T")[0];
const CATEGORIES = ["vfx", "english", "engineer", "investment", "fitness", "personal"];

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

interface TodayTabProps {
  onStartFocus: (todo: TodoV2) => void;
}

export default function TodayTab({ onStartFocus }: TodayTabProps) {
  const [todos, setTodos] = useState<TodoV2[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<GoalV2[]>([]);
  // localStorage で表示設定を永続化
  const [showWeeklyGoals, setShowWeeklyGoals] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("v2_show_weekly_goals") !== "false";
    }
    return true;
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateTodoV2>({
    title: "",
    category: "personal",
    priority: 3,
    estimated_minutes: 30,
    scheduled_date: TODAY,
    scheduled_start: "",
    goal_id: undefined,
  });
  const [loading, setLoading] = useState(false);

  const fetchTodos = useCallback(async () => {
    const res = await fetch(`/api/v2/todos?date=${TODAY}&include_unscheduled=true`);
    if (res.ok) setTodos(await res.json());
  }, []);

  const fetchWeeklyGoals = useCallback(async () => {
    const res = await fetch("/api/v2/goals");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const { start, end } = getThisWeekRange();
        setWeeklyGoals(
          data.filter((g: GoalV2) =>
            g.period_type === "weekly" && g.start_date <= end && g.end_date >= start
          )
        );
      }
    }
  }, []);

  useEffect(() => {
    fetchTodos();
    fetchWeeklyGoals();
  }, [fetchTodos, fetchWeeklyGoals]);

  const handleComplete = async (todo: TodoV2) => {
    await fetch(`/api/v2/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_completed: !todo.is_completed }),
    });
    fetchTodos();
  };

  const handleSetMIT = async (todo: TodoV2) => {
    await fetch(`/api/v2/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_mit: !todo.is_mit }),
    });
    fetchTodos();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/v2/todos/${id}`, { method: "DELETE" });
    fetchTodos();
  };

  const handleMoveToOther = async (id: number) => {
    await fetch(`/api/v2/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_date: null }),
    });
    fetchTodos();
  };

  const toggleWeeklyGoals = (val: boolean) => {
    setShowWeeklyGoals(val);
    localStorage.setItem("v2_show_weekly_goals", String(val));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/v2/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          scheduled_date: TODAY,
          scheduled_start: form.scheduled_start || null,
          goal_id: form.goal_id ?? null,
        }),
      });
      setShowForm(false);
      setForm({ title: "", category: "personal", priority: 3, estimated_minutes: 30, scheduled_date: TODAY, scheduled_start: "", goal_id: undefined });
      fetchTodos();
    } finally {
      setLoading(false);
    }
  };

  const mit = todos.find((t) => t.is_mit && !t.is_completed);
  const completed = todos.filter((t) => t.is_completed);
  const incomplete = todos.filter((t) => !t.is_completed);
  const completionRate = todos.length > 0 ? Math.round((completed.length / todos.length) * 100) : 0;
  const totalActual = todos.filter((t) => t.is_completed).reduce((s, t) => s + (t.actual_minutes ?? t.estimated_minutes), 0);

  return (
    <div className="pb-24">
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-gray-500 text-xs">{new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}</p>
            <h2 className="text-white font-bold text-lg">今日</h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{completed.length}/{todos.length}件完了</p>
            <p className="text-xs text-gray-600">実績 {totalActual}分</p>
          </div>
        </div>
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${completionRate}%` }} />
        </div>
        <p className="text-right text-xs text-gray-600 mt-0.5">{completionRate}%</p>
      </div>

      {/* 今週の目標（折りたたみ） */}
      {weeklyGoals.length > 0 && (
        <div className="mx-4 mb-3 bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleWeeklyGoals(!showWeeklyGoals)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-xs font-semibold">📅 今週の目標</span>
              <span className="text-xs text-gray-600">{weeklyGoals.length}件</span>
              {!showWeeklyGoals && (
                <span className="text-xs text-gray-600 border border-gray-700 px-1.5 py-0.5 rounded">非表示中</span>
              )}
            </div>
            {/* トグルスイッチ */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-4 rounded-full transition-colors relative ${showWeeklyGoals ? "bg-green-600" : "bg-gray-700"}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showWeeklyGoals ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </div>
          </button>
          {showWeeklyGoals && (
            <div className="px-3 pb-3 space-y-2 border-t border-gray-800">
              {weeklyGoals.map((g) => {
                const progress = g.target_value
                  ? Math.min(100, Math.round((g.current_value / g.target_value) * 100))
                  : null;
                return (
                  <div key={g.id} className="pt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{CATEGORY_EMOJI[g.category] ?? "📌"}</span>
                      <p className="text-xs text-gray-200 flex-1 truncate">{g.title}</p>
                      {progress !== null && (
                        <span className="text-xs text-gray-500 shrink-0">{progress}%</span>
                      )}
                    </div>
                    {progress !== null && (
                      <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden ml-5">
                        <div
                          className={`h-full rounded-full ${g.is_achieved ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MIT バッジ */}
      {mit && (
        <div className="mx-4 mb-3 border-2 border-red-600 rounded-xl p-3 bg-red-950/40">
          <p className="text-red-400 text-xs font-bold mb-1">🎯 今日これだけ</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg">{CATEGORY_EMOJI[mit.category] ?? "📌"}</span>
              <p className="text-white font-semibold text-sm truncate">{mit.title}</p>
            </div>
            <button
              onClick={() => onStartFocus(mit)}
              className="shrink-0 text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              ▶ 集中
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-1">⏱ 見積 {mit.estimated_minutes}分</p>
        </div>
      )}

      {/* タスクリスト */}
      <div className="px-4 space-y-2">
        {incomplete.map((todo) => (
          <TodoCard
            key={todo.id}
            todo={todo}
            weeklyGoals={weeklyGoals}
            onComplete={() => handleComplete(todo)}
            onSetMIT={() => handleSetMIT(todo)}
            onDelete={() => handleDelete(todo.id)}
            onFocus={() => onStartFocus(todo)}
            onMoveToOther={todo.goal_id == null ? () => handleMoveToOther(todo.id) : undefined}
          />
        ))}

        {/* 追加ボタン */}
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full py-2 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-colors"
        >
          {showForm ? "▲ 閉じる" : "+ タスクを追加"}
        </button>

        {/* 追加フォーム */}
        {showForm && (
          <div className="bg-gray-800 rounded-xl p-4 space-y-3 border border-gray-700">
            <input
              placeholder="タスク名 *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            {/* 目標への紐づけ */}
            {weeklyGoals.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">今週の目標に紐づける（任意）</label>
                <select
                  value={form.goal_id ?? ""}
                  onChange={(e) => setForm({ ...form, goal_id: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
                >
                  <option value="">なし（その他タスク）</option>
                  {weeklyGoals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {CATEGORY_EMOJI[g.category] ?? ""} {g.title.slice(0, 30)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">カテゴリ</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">優先度</label>
                <div className="flex gap-1">
                  {([1, 3, 5] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm({ ...form, priority: p })}
                      className={`flex-1 py-1.5 rounded text-xs border transition-colors ${form.priority === p ? PRIORITY_COLOR[p] : "border-gray-600 text-gray-500"}`}
                    >
                      {PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">見積（分）</label>
                <input
                  type="number"
                  value={form.estimated_minutes}
                  onChange={(e) => setForm({ ...form, estimated_minutes: Number(e.target.value) })}
                  min={5} step={5}
                  className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">開始時刻（任意）</label>
                <input
                  type="time"
                  value={form.scheduled_start ?? ""}
                  onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !form.title.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "追加中..." : "追加"}
            </button>
          </div>
        )}

        {/* 完了済み */}
        {completed.length > 0 && (
          <details className="mt-2">
            <summary className="text-gray-600 text-xs cursor-pointer hover:text-gray-400 select-none py-1">
              ✅ 完了済み ({completed.length}件)
            </summary>
            <div className="mt-2 space-y-2">
              {completed.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  weeklyGoals={weeklyGoals}
                  onComplete={() => handleComplete(todo)}
                  onSetMIT={() => {}}
                  onDelete={() => handleDelete(todo.id)}
                  onFocus={() => {}}
                  dimmed
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function TodoCard({
  todo, weeklyGoals, onComplete, onSetMIT, onDelete, onFocus, onMoveToOther, dimmed = false,
}: {
  todo: TodoV2;
  weeklyGoals: GoalV2[];
  onComplete: () => void;
  onSetMIT: () => void;
  onDelete: () => void;
  onFocus: () => void;
  onMoveToOther?: () => void;
  dimmed?: boolean;
}) {
  const catColor = CATEGORY_COLOR[todo.category] ?? CATEGORY_COLOR.personal;
  const priColor = PRIORITY_COLOR[todo.priority] ?? PRIORITY_COLOR[3];
  const linkedGoal = todo.goal_id ? weeklyGoals.find((g) => g.id === todo.goal_id) : null;

  return (
    <div className={`bg-gray-900 border rounded-xl p-3 transition-all ${todo.is_mit ? "border-red-700" : "border-gray-800"} ${dimmed ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        {/* チェックボックス */}
        <button
          onClick={onComplete}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${todo.is_completed ? "bg-blue-600 border-blue-600" : "border-gray-600 hover:border-blue-500"}`}
        >
          {todo.is_completed && <span className="text-white text-xs">✓</span>}
        </button>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span>{CATEGORY_EMOJI[todo.category] ?? "📌"}</span>
            <p className={`text-sm font-medium truncate ${todo.is_completed ? "line-through text-gray-500" : "text-gray-100"}`}>
              {todo.title}
            </p>
            {todo.is_mit && <span className="text-red-400 text-xs shrink-0">🎯</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded border ${catColor}`}>{CATEGORY_LABEL[todo.category]}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${priColor}`}>{PRIORITY_LABEL[todo.priority] ?? "中"}</span>
            <span className="text-xs text-gray-600">⏱{todo.estimated_minutes}分</span>
            {todo.scheduled_start && <span className="text-xs text-gray-600">🕐{todo.scheduled_start.slice(0, 5)}</span>}
            {linkedGoal && (
              <span className="text-xs text-green-600 px-1.5 py-0.5 rounded border border-green-800 bg-green-900/30 truncate max-w-[120px]">
                📅 {linkedGoal.title.slice(0, 15)}
              </span>
            )}
            {!todo.goal_id && (
              <span className="text-xs text-gray-700 px-1 py-0.5 rounded border border-gray-800">その他</span>
            )}
          </div>
        </div>

        {/* アクション */}
        {!todo.is_completed && (
          <div className="flex items-center gap-1 shrink-0">
            {onMoveToOther && (
              <button
                onClick={onMoveToOther}
                className="text-xs px-1.5 py-0.5 rounded border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors"
                title="その他タスクに戻す"
              >📋</button>
            )}
            <button
              onClick={onSetMIT}
              className={`text-sm px-1.5 py-1 rounded transition-colors ${todo.is_mit ? "text-red-400" : "text-gray-600 hover:text-red-400"}`}
              title="MITに設定"
            >🎯</button>
            <button
              onClick={onFocus}
              className="text-sm px-1.5 py-1 rounded text-gray-600 hover:text-green-400 transition-colors"
              title="集中開始"
            >▶</button>
            <button
              onClick={onDelete}
              className="text-xs text-gray-700 hover:text-red-500 transition-colors px-1"
            >✕</button>
          </div>
        )}
      </div>
    </div>
  );
}
