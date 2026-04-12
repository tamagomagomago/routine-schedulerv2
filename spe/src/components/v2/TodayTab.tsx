"use client";

import { useState, useEffect, useCallback } from "react";
import { TodoV2, CreateTodoV2, GoalV2, CATEGORY_EMOJI, CATEGORY_LABEL, CATEGORY_COLOR, PRIORITY_COLOR, PRIORITY_LABEL } from "@/types/v2";

const TODAY = new Date().toISOString().split("T")[0];
const CATEGORIES = ["video", "english", "investment", "ai", "personal", "fitness", "engineer", "life_design"];

// 毎日のプランク
const PLANK_TITLE = "🧘 プランク";

// 曜日ごとのダンベルトレメニュー（平日のみ）
const DUMBBELL_MENU: Record<number, string> = {
  1: "🏋️ ダンベルトレ（胸・肩）",     // 月
  2: "🏋️ ダンベルトレ（背中・二頭）", // 火
  3: "🏋️ ダンベルトレ（脚）",         // 水
  4: "🏋️ ダンベルトレ（胸・肩）",     // 木
  5: "🏋️ ダンベルトレ（背中・二頭）", // 金
};

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

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function formatTimeInput(input: string, isPadding: boolean = false): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0) return "";

  // 3桁で、パディング指定時のみ冒頭に0を補完
  if (digits.length === 3 && isPadding) {
    const padded = "0" + digits;
    const hh = padded.slice(0, 2);
    const mm = padded.slice(2, 4);
    return `${hh}:${mm}`;
  }

  if (digits.length <= 2) return digits;
  if (digits.length === 3) return digits; // パディングなしで3桁のままにする
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  return `${hh}:${mm}`;
}

function formatDisplayTime(time: string): string {
  if (!time) return "";
  // HH:MM形式で返す（秒を削除）
  return time.slice(0, 5);
}

interface TodayTabProps {
  onStartFocus: (todo: TodoV2) => void;
}

export default function TodayTab({ onStartFocus }: TodayTabProps) {
  const [activeTab, setActiveTab] = useState<"list" | "today">("today");
  const [allTodos, setAllTodos] = useState<TodoV2[]>([]);
  const [todayTodos, setTodayTodos] = useState<TodoV2[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<GoalV2[]>([]);
  const [showWeeklyGoals, setShowWeeklyGoals] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("v2_show_weekly_goals") !== "false";
    }
    return true;
  });
  const [weeklyPlanningNotes, setWeeklyPlanningNotes] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("v2_weekly_planning_notes") || "";
    }
    return "";
  });
  const [showWeeklyPlanningForm, setShowWeeklyPlanningForm] = useState(false);
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
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<TodoV2> | null>(null);
  const [editingField, setEditingField] = useState<"title" | "time" | "todayTitle" | "todayTime" | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingPriorityId, setEditingPriorityId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const [allRes, todayRes, goalsRes] = await Promise.all([
      fetch("/api/v2/todos"),
      fetch(`/api/v2/todos?date=${TODAY}`),
      fetch("/api/v2/goals"),
    ]);

    if (allRes.ok) {
      const data = await allRes.json();
      // TODOリストは「今日の日付が設定されていない」もののみ
      setAllTodos(Array.isArray(data) ? data.filter((t: TodoV2) => !t.scheduled_date || t.scheduled_date !== TODAY) : []);
    }

    if (todayRes.ok) {
      const data = await todayRes.json();
      setTodayTodos(Array.isArray(data) ? data : []);
    }

    if (goalsRes.ok) {
      const data = await goalsRes.json();
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
    fetchData();

    // プランク＋ダンベルトレーニングを自動追加
    const day = new Date().getDay();

    const addFitnessRoutine = async () => {
      const res = await fetch(`/api/v2/todos?date=${TODAY}`);
      if (res.ok) {
        const existingTodos = await res.json();
        const hasPlank = existingTodos?.some((t: TodoV2) => t.title?.includes("プランク"));
        const hasDumbbell = existingTodos?.some((t: TodoV2) => t.title?.includes("ダンベルトレ"));

        // プランクを追加（毎日）
        if (!hasPlank) {
          await fetch("/api/v2/todos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: PLANK_TITLE,
              category: "fitness",
              priority: 3,
              estimated_minutes: 10,
              scheduled_date: TODAY,
              scheduled_start: "06:30",
            }),
          });
        }

        // ダンベルトレーニングを追加（平日のみ）
        const isDumbbellDay = [1, 2, 3, 4, 5].includes(day);
        if (isDumbbellDay && !hasDumbbell) {
          const dumbbellTitle = DUMBBELL_MENU[day] || "🏋️ ダンベルトレ";
          await fetch("/api/v2/todos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: dumbbellTitle,
              category: "fitness",
              priority: 3,
              estimated_minutes: 30,
              scheduled_date: TODAY,
              scheduled_start: "07:00",
            }),
          });
        }

        if (!hasPlank || (isDumbbellDay && !hasDumbbell)) {
          fetchData();
        }
      }
    };

    addFitnessRoutine();
  }, [fetchData]);

  const handleComplete = async (todo: TodoV2) => {
    const newIsCompleted = !todo.is_completed;
    const completed_at = newIsCompleted ? new Date().toISOString() : null;

    // 即座に UI を更新
    setTodayTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id ? { ...t, is_completed: newIsCompleted, completed_at } : t
      )
    );

    const res = await fetch(`/api/v2/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_completed: newIsCompleted, completed_at }),
    });

    // TODOが完了したら、関連する目標の進捗を更新
    if (res.ok && newIsCompleted && todo.goal_id) {
      const goal = weeklyGoals.find((g) => g.id === todo.goal_id);
      if (goal) {
        const newValue = (goal.current_value || 0) + (todo.estimated_minutes / 60);
        await fetch(`/api/v2/goals/${todo.goal_id}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_value: newValue }),
        });
      }
    }

    if (res.ok) fetchData();
  };

  const handleSetMIT = async (todo: TodoV2) => {
    const res = await fetch(`/api/v2/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_mit: !todo.is_mit }),
    });
    if (res.ok) fetchData();
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/v2/todos/${id}`, { method: "DELETE" });
    if (res.ok) fetchData();
  };

  const handleAddToToday = async (id: number) => {
    const res = await fetch(`/api/v2/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_date: TODAY }),
    });
    if (res.ok) fetchData();
  };

  const handleRemoveFromToday = async (id: number) => {
    const res = await fetch(`/api/v2/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_date: null }),
    });
    if (res.ok) fetchData();
  };

  const handlePriorityChange = async (id: number, newPriority: number) => {
    const res = await fetch(`/api/v2/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: newPriority }),
    });
    if (res.ok) fetchData();
  };

  const handleEdit = async (todo: TodoV2) => {
    setEditingTodoId(todo.id);
    setEditForm(todo);
  };

  const handleInlineEditStart = (field: "title" | "time" | "todayTitle" | "todayTime", todoId: number) => {
    setEditingField(field);
    setEditingTodoId(todoId);
  };

  const handleInlineEditSave = async (id: number, field: "title" | "time" | "todayTitle" | "todayTime", value: string) => {
    const updates: any = {};
    if (field === "title" || field === "todayTitle") {
      updates.title = value;
    } else if (field === "time" || field === "todayTime") {
      updates.scheduled_start = value || null;
    }

    const res = await fetch(`/api/v2/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      setEditingField(null);
      setEditingTodoId(null);
      fetchData();
    }
  };

  const handleCategoryChange = async (id: number, newCategory: string) => {
    const res = await fetch(`/api/v2/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory }),
    });

    if (res.ok) {
      setEditingCategoryId(null);
      fetchData();
    }
  };

  const handlePriorityChange = async (id: number, newPriority: number) => {
    const res = await fetch(`/api/v2/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: newPriority }),
    });

    if (res.ok) {
      setEditingPriorityId(null);
      fetchData();
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTodoId || !editForm) return;
    const res = await fetch(`/api/v2/todos/${editingTodoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title,
        category: editForm.category,
        priority: editForm.priority,
        estimated_minutes: editForm.estimated_minutes,
        scheduled_start: editForm.scheduled_start || null,
        goal_id: editForm.goal_id || null,
      }),
    });
    if (res.ok) {
      setEditingTodoId(null);
      setEditForm(null);
      fetchData();
    }
  };

  const handleDeleteTodo = async (id: number) => {
    if (typeof window !== "undefined" && window.confirm("本当に削除しますか？")) {
      const res = await fetch(`/api/v2/todos/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      // 送信時に3桁の時刻に0を補完
      const formattedStart = form.scheduled_start
        ? formatTimeInput(form.scheduled_start, true)
        : null;

      const res = await fetch("/api/v2/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          scheduled_date: TODAY,
          scheduled_start: formattedStart,
          goal_id: null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ title: "", category: "personal", priority: 3, estimated_minutes: 30, scheduled_date: TODAY, scheduled_start: "", goal_id: undefined });
        fetchData();
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleWeeklyGoals = (val: boolean) => {
    setShowWeeklyGoals(val);
    localStorage.setItem("v2_show_weekly_goals", String(val));
  };

  const saveWeeklyPlanningNotes = (notes: string) => {
    setWeeklyPlanningNotes(notes);
    localStorage.setItem("v2_weekly_planning_notes", notes);
  };

  const todayIncomplete = todayTodos.filter((t) => !t.is_completed);
  const todayCompleted = todayTodos.filter((t) => t.is_completed);
  const todayMit = todayIncomplete.find((t) => t.is_mit);
  const todayCompletionRate = todayTodos.length > 0 ? Math.round((todayCompleted.length / todayTodos.length) * 100) : 0;
  const todayTotalActual = todayCompleted.reduce((s, t) => s + (t.actual_minutes ?? t.estimated_minutes), 0);

  // Sort today todos by start time
  const todayIncompleteSorted = [...todayIncomplete].sort((a, b) => {
    const aTime = a.scheduled_start || "23:59";
    const bTime = b.scheduled_start || "23:59";
    return aTime.localeCompare(bTime);
  });

  // Sort all todos by priority and MIT
  const allTodosSorted = [...allTodos].sort((a, b) => {
    if (a.is_mit !== b.is_mit) return (b.is_mit ? 1 : 0) - (a.is_mit ? 1 : 0);
    return a.priority - b.priority;
  });

  return (
    <div className="pb-24">
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-gray-500 text-xs">{new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}</p>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-white font-bold text-lg">今日</h2>
          <div className="text-right">
            <p className="text-xs text-gray-500">{todayCompleted.length}/{todayTodos.length}件完了</p>
            <p className="text-xs text-gray-600">実績 {todayTotalActual}分</p>
          </div>
        </div>
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${todayCompletionRate}%` }} />
        </div>
        <p className="text-right text-xs text-gray-600 mt-0.5">{todayCompletionRate}%</p>
      </div>

      {/* 今週の目標（常に表示） */}
      {weeklyGoals.length > 0 && (
        <div className="mx-4 mb-4 bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden">
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
            <div className={`w-8 h-4 rounded-full transition-colors relative ${showWeeklyGoals ? "bg-green-600" : "bg-gray-700"}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showWeeklyGoals ? "translate-x-4" : "translate-x-0.5"}`} />
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

      {/* 今週の方針（メモ） */}
      {showWeeklyGoals && weeklyGoals.length > 0 && (
        <div className="mx-4 mb-4 bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowWeeklyPlanningForm(!showWeeklyPlanningForm)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-800/50 transition-colors"
          >
            <span className="text-blue-400 text-xs font-semibold">📝 今週の方針</span>
            <div className={`w-8 h-4 rounded-full transition-colors relative ${showWeeklyPlanningForm ? "bg-blue-600" : "bg-gray-700"}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showWeeklyPlanningForm ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </button>
          {showWeeklyPlanningForm && (
            <div className="px-3 pb-3 border-t border-gray-800 pt-3">
              <textarea
                value={weeklyPlanningNotes}
                onChange={(e) => saveWeeklyPlanningNotes(e.target.value)}
                placeholder="今週のタスクが多い時に、どのタスクを優先するか、どんなペースで進めるかなど、戦略をメモしておきましょう..."
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
              />
              <p className="text-xs text-gray-600 mt-2">💡 このメモは今週のタスク配置の参考になります</p>
            </div>
          )}
        </div>
      )}

      {/* タブ切り替え（今週の目標の下） */}
      <div className="px-4 mb-4 flex gap-2">
        <button
          onClick={() => setActiveTab("today")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "today"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          📅 今日のTODO
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "list"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          📋 TODOリスト
        </button>
      </div>

      {/* TODOリスト一覧 */}
      {activeTab === "list" && (
        <div className="px-4 space-y-2">
          <div className="text-gray-500 text-xs mb-3">全TODOリスト ({allTodos.length}件)</div>
          {allTodos.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">TODOはありません</p>
          ) : (
            <>
              {allTodosSorted.map((todo) => (
                <div key={todo.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-lg shrink-0">{CATEGORY_EMOJI[todo.category] ?? "📌"}</span>
                        {editingField === "title" && editingTodoId === todo.id ? (
                          <input
                            autoFocus
                            defaultValue={todo.title}
                            onBlur={(e) => handleInlineEditSave(todo.id, "title", e.currentTarget.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleInlineEditSave(todo.id, "title", e.currentTarget.value);
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                setEditingField(null);
                              }
                            }}
                            className="flex-1 bg-gray-700 text-white rounded-lg px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p
                            onClick={() => handleInlineEditStart("title", todo.id)}
                            className="text-sm font-medium text-gray-100 break-words flex-1 cursor-pointer hover:text-blue-300"
                          >
                            {todo.title}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className={`px-1.5 py-0.5 rounded border ${CATEGORY_COLOR[todo.category] ?? CATEGORY_COLOR.personal}`}>
                          {CATEGORY_LABEL[todo.category]}
                        </span>
                        {editingField === "time" && editingTodoId === todo.id ? (
                          <input
                            autoFocus
                            type="text"
                            placeholder="0900"
                            defaultValue={(todo.scheduled_start || "").replace(":", "")}
                            onBlur={(e) => handleInlineEditSave(todo.id, "time", formatTimeInput(e.currentTarget.value))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleInlineEditSave(todo.id, "time", formatTimeInput(e.currentTarget.value));
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                setEditingField(null);
                              }
                            }}
                            maxLength={5}
                            className="px-1.5 py-0.5 rounded border border-blue-600 bg-gray-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span
                            onClick={() => handleInlineEditStart("time", todo.id)}
                            className="text-gray-600 cursor-pointer hover:text-blue-400 transition-colors"
                          >
                            ⏱ {todo.estimated_minutes}分{todo.scheduled_start && ` (${todo.scheduled_start})`}
                          </span>
                        )}
                        {todo.goal_id && weeklyGoals.find(g => g.id === todo.goal_id) && (
                          <span className="px-1.5 py-0.5 rounded border border-purple-700 text-purple-400 bg-purple-950/40">
                            🎯 {weeklyGoals.find(g => g.id === todo.goal_id)?.title.slice(0, 10)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* アクション */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAddToToday(todo.id)}
                        className="text-xs px-2 py-1 rounded border border-blue-700 text-blue-400 hover:bg-blue-900/40 transition-colors"
                        title="今日に追加"
                      >
                        📅 今日へ
                      </button>
                      <button
                        onClick={() => handleDelete(todo.id)}
                        className="text-gray-700 hover:text-red-500 text-sm transition-colors"
                        title="削除"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {/* TODOリストへの追加ボタン */}
              <button
                onClick={() => setShowForm((v) => !v)}
                className="w-full py-2 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-colors"
              >
                {showForm ? "▲ 閉じる" : "+ タスクを追加"}
              </button>

              {/* TODOリストへの追加フォーム */}
              {showForm && (
                <div className="bg-gray-800 rounded-xl p-4 space-y-3 border border-gray-700">
                  <input
                    placeholder="タスク名 *"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (form.title.trim()) handleSubmit();
                      }
                    }}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />

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
                            className={`flex-1 py-1.5 rounded text-xs border transition-colors ${
                              form.priority === p ? PRIORITY_COLOR[p] : "border-gray-600 text-gray-500"
                            }`}
                          >
                            {PRIORITY_LABEL[p]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">見積（分）</label>
                    <input
                      type="number"
                      value={form.estimated_minutes}
                      onChange={(e) => setForm({ ...form, estimated_minutes: Number(e.target.value) })}
                      min={5}
                      step={5}
                      className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!form.title.trim()) return;
                      setLoading(true);
                      const formattedStart = form.scheduled_start
                        ? formatTimeInput(form.scheduled_start, true)
                        : null;

                      fetch("/api/v2/todos", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          ...form,
                          scheduled_date: null,
                          scheduled_start: formattedStart,
                          goal_id: null,
                        }),
                      }).then((res) => {
                        if (res.ok) {
                          setShowForm(false);
                          setForm({ title: "", category: "personal", priority: 3, estimated_minutes: 30, scheduled_date: TODAY, scheduled_start: "", goal_id: undefined });
                          fetchData();
                        }
                        setLoading(false);
                      });
                    }}
                    disabled={loading || !form.title.trim()}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {loading ? "追加中..." : "追加"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 今日のTODO */}
      {activeTab === "today" && (
        <div className="px-4 space-y-3">
          {/* MIT バッジ */}
          {todayMit && (
            <div className="border-2 border-red-600 rounded-xl p-3 bg-red-950/40">
              <p className="text-red-400 text-xs font-bold mb-1">🎯 今日これだけ</p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg">{CATEGORY_EMOJI[todayMit.category] ?? "📌"}</span>
                  <p className="text-white font-semibold text-sm truncate">{todayMit.title}</p>
                </div>
                <button
                  onClick={() => onStartFocus(todayMit)}
                  className="shrink-0 text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  ▶ 集中
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1">⏱ 見積 {todayMit.estimated_minutes}分</p>
            </div>
          )}

          {/* 今日のタスクリスト */}
          {todayIncompleteSorted.length === 0 && todayCompleted.length === 0 ? (
            <div className="text-center text-gray-600 text-sm py-4">今日のタスクはありません</div>
          ) : (
            <>
              {todayIncompleteSorted.map((todo) => {
                const endTime = todo.scheduled_start
                  ? addMinutesToTime(todo.scheduled_start, todo.estimated_minutes)
                  : null;
                const isEditing = editingTodoId === todo.id;

                if (isEditing && editForm) {
                  return (
                    <div key={todo.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3 space-y-3">
                      <input
                        placeholder="タスク名"
                        value={editForm.title || ""}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">カテゴリ</label>
                          <select
                            value={editForm.category || "personal"}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
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
                                onClick={() => setEditForm({ ...editForm, priority: p })}
                                className={`flex-1 py-1.5 rounded text-xs border transition-colors ${
                                  editForm.priority === p ? PRIORITY_COLOR[p] : "border-gray-600 text-gray-500"
                                }`}
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
                            value={editForm.estimated_minutes || 30}
                            onChange={(e) => setEditForm({ ...editForm, estimated_minutes: Number(e.target.value) })}
                            min={5}
                            step={5}
                            className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">開始時刻（4桁）</label>
                          <input
                            type="text"
                            placeholder="0900"
                            value={(editForm.scheduled_start || "").replace(":", "")}
                            onChange={(e) => {
                              const formatted = formatTimeInput(e.target.value);
                              setEditForm({ ...editForm, scheduled_start: formatted });
                            }}
                            maxLength={5}
                            className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                      {weeklyGoals.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">関連する目標（任意）</label>
                          <select
                            value={editForm.goal_id || ""}
                            onChange={(e) => setEditForm({ ...editForm, goal_id: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
                          >
                            <option value="">目標を選択...</option>
                            {weeklyGoals.map((g) => (
                              <option key={g.id} value={g.id}>
                                {CATEGORY_EMOJI[g.category] ?? "📌"} {g.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingTodoId(null)}
                          className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={todo.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      {/* チェックボックス */}
                      <button
                        onClick={() => handleComplete(todo)}
                        className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                          todo.is_completed
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-500 hover:border-blue-400 bg-gray-800/50"
                        }`}
                        title="完了/未完了"
                      >
                        {todo.is_completed && <span className="text-white text-xs font-bold">✓</span>}
                      </button>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        {/* タイトル + 時刻行 */}
                        <div className="flex items-start gap-2 mb-1">
                          <span>{CATEGORY_EMOJI[todo.category] ?? "📌"}</span>
                          <div className="flex-1 flex flex-col gap-1">
                            {/* タイトル */}
                            {editingField === "todayTitle" && editingTodoId === todo.id ? (
                              <input
                                autoFocus
                                type="text"
                                defaultValue={todo.title}
                                onBlur={(e) => handleInlineEditSave(todo.id, "title", e.currentTarget.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleInlineEditSave(todo.id, "title", e.currentTarget.value);
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    setEditingField(null);
                                    setEditingTodoId(null);
                                  }
                                }}
                                className="bg-gray-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                              />
                            ) : (
                              <p
                                onClick={() => handleInlineEditStart("todayTitle", todo.id)}
                                className={`text-sm font-medium flex-1 break-words cursor-pointer hover:text-blue-300 transition-colors ${
                                  todo.is_completed ? "line-through text-gray-500" : "text-gray-100"
                                }`}
                              >
                                {todo.title}
                              </p>
                            )}

                            {/* カテゴリ + 優先度行 */}
                            <div className="flex items-center gap-2 text-xs mt-1">
                              {/* カテゴリドロップダウン */}
                              {editingCategoryId === todo.id ? (
                                <select
                                  autoFocus
                                  value={todo.category}
                                  onChange={(e) => handleCategoryChange(todo.id, e.target.value)}
                                  onBlur={() => setEditingCategoryId(null)}
                                  className="bg-gray-700 text-white rounded px-2 py-0.5 text-xs"
                                >
                                  {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}</option>
                                  ))}
                                </select>
                              ) : (
                                <button
                                  onClick={() => setEditingCategoryId(todo.id)}
                                  className="text-gray-400 hover:text-gray-200 transition-colors"
                                  title="分類を変更"
                                >
                                  {CATEGORY_EMOJI[todo.category] ?? "📌"} {CATEGORY_LABEL[todo.category] || todo.category}
                                </button>
                              )}

                              {/* 優先度ボタン */}
                              {editingPriorityId === todo.id ? (
                                <div className="flex gap-1">
                                  {([1, 3, 5] as const).map((p) => (
                                    <button
                                      key={p}
                                      onClick={() => handlePriorityChange(todo.id, p)}
                                      className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                                        todo.priority === p ? PRIORITY_COLOR[p] : "border-gray-600 text-gray-500"
                                      }`}
                                    >
                                      {PRIORITY_LABEL[p]}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingPriorityId(todo.id)}
                                  className={`px-2 py-0.5 rounded text-xs border ${PRIORITY_COLOR[todo.priority]}`}
                                  title="優先度を変更"
                                >
                                  {PRIORITY_LABEL[todo.priority]}
                                </button>
                              )}
                            </div>

                            {/* 時刻行 */}
                            {todo.scheduled_start && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">時刻:</span>
                                {editingField === "todayTime" && editingTodoId === todo.id ? (
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder="0900"
                                    defaultValue={formatDisplayTime(todo.scheduled_start).replace(":", "")}
                                    onBlur={(e) => handleInlineEditSave(todo.id, "time", formatTimeInput(e.currentTarget.value, true))}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleInlineEditSave(todo.id, "time", formatTimeInput(e.currentTarget.value, true));
                                      }
                                      if (e.key === "Escape") {
                                        e.preventDefault();
                                        setEditingField(null);
                                        setEditingTodoId(null);
                                      }
                                    }}
                                    maxLength={4}
                                    className="bg-gray-700 text-white rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-16"
                                  />
                                ) : (
                                  <span
                                    onClick={() => handleInlineEditStart("todayTime", todo.id)}
                                    className="text-sm font-bold text-white cursor-pointer hover:text-blue-300 transition-colors"
                                  >
                                    {formatDisplayTime(todo.scheduled_start)} ～ {formatDisplayTime(endTime)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {todo.is_mit && <span className="text-red-400 text-xs shrink-0">🎯</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs mt-1">
                          <span className={`px-1.5 py-0.5 rounded border ${CATEGORY_COLOR[todo.category] ?? CATEGORY_COLOR.personal}`}>
                            {CATEGORY_LABEL[todo.category]}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded border ${PRIORITY_COLOR[todo.priority] ?? PRIORITY_COLOR[3]}`}>
                            {PRIORITY_LABEL[todo.priority] ?? "中"}
                          </span>
                          <span className="text-gray-600">⏱ {todo.estimated_minutes}分</span>
                          {todo.goal_id && weeklyGoals.find(g => g.id === todo.goal_id) && (
                            <span className="px-1.5 py-0.5 rounded border border-purple-700 text-purple-400 bg-purple-950/40">
                              🎯 {weeklyGoals.find(g => g.id === todo.goal_id)?.title.slice(0, 12)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* アクション - 3行配置 */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(todo)}
                            className="text-sm px-1.5 py-1 rounded text-gray-600 hover:text-blue-400 transition-colors"
                            title="編集"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => onStartFocus(todo)}
                            className="text-sm px-1.5 py-1 rounded text-gray-600 hover:text-green-400 transition-colors"
                            title="集中開始"
                          >
                            ▶
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRemoveFromToday(todo.id)}
                            className="text-sm px-1.5 py-1 rounded text-gray-600 hover:text-orange-400 transition-colors"
                            title="TODOリストに移す"
                          >
                            ↩
                          </button>
                          <button
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="text-sm px-1.5 py-1 rounded text-gray-600 hover:text-red-500 transition-colors"
                            title="削除"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 追加ボタン */}
              <button
                onClick={() => setShowForm((v) => !v)}
                className="w-full py-2 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-colors"
              >
                {showForm ? "▲ 閉じる" : "+ タスクを追加"}
              </button>

              {/* 高速追加フォーム */}
              {showForm && (
                <div className="bg-gray-800 rounded-xl p-3 space-y-2 border border-gray-700">
                  <div className="flex gap-2">
                    <input
                      placeholder="タスク名を入力..."
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (form.title.trim()) handleSubmit();
                        }
                      }}
                      className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={loading || !form.title.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {loading ? "中..." : "追加"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">💡 追加後、詳細は一覧から修正できます</p>
                </div>
              )}

              {/* 完了済み */}
              {todayCompleted.length > 0 && (
                <details className="mt-3">
                  <summary className="text-gray-600 text-xs cursor-pointer hover:text-gray-400 select-none py-1">
                    ✅ 完了済み ({todayCompleted.length}件)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {todayCompleted.map((todo) => {
                      const endTime = todo.scheduled_start
                        ? addMinutesToTime(todo.scheduled_start, todo.estimated_minutes)
                        : null;
                      const isEditing = editingTodoId === todo.id;

                      if (isEditing && editForm) {
                        return (
                          <div key={todo.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3 space-y-3">
                            <input
                              placeholder="タスク名"
                              value={editForm.title || ""}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">カテゴリ</label>
                                <select
                                  value={editForm.category || "personal"}
                                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
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
                                      onClick={() => setEditForm({ ...editForm, priority: p })}
                                      className={`flex-1 py-1.5 rounded text-xs border transition-colors ${
                                        editForm.priority === p ? PRIORITY_COLOR[p] : "border-gray-600 text-gray-500"
                                      }`}
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
                                  value={editForm.estimated_minutes || 30}
                                  onChange={(e) => setEditForm({ ...editForm, estimated_minutes: Number(e.target.value) })}
                                  min={5}
                                  step={5}
                                  className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">開始時刻（4桁）</label>
                                <input
                                  type="text"
                                  placeholder="0900"
                                  value={(editForm.scheduled_start || "").replace(":", "")}
                                  onChange={(e) => {
                                    const formatted = formatTimeInput(e.target.value);
                                    setEditForm({ ...editForm, scheduled_start: formatted });
                                  }}
                                  maxLength={5}
                                  className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
                                />
                              </div>
                            </div>
                            {weeklyGoals.length > 0 && (
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">関連する目標（任意）</label>
                                <select
                                  value={editForm.goal_id || ""}
                                  onChange={(e) => setEditForm({ ...editForm, goal_id: e.target.value ? Number(e.target.value) : undefined })}
                                  className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
                                >
                                  <option value="">目標を選択...</option>
                                  {weeklyGoals.map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {CATEGORY_EMOJI[g.category] ?? "📌"} {g.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveEdit}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingTodoId(null)}
                                className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={todo.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 opacity-50">
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => handleComplete(todo)}
                              className="w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all bg-blue-600 border-blue-600"
                            >
                              <span className="text-white text-xs font-bold">✓</span>
                            </button>
                            {todo.scheduled_start && (
                              <div className="text-sm font-bold text-gray-400 shrink-0">
                                {todo.scheduled_start} ～ {endTime}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2">
                                <span>{CATEGORY_EMOJI[todo.category] ?? "📌"}</span>
                                <p className="text-sm font-medium flex-1 break-words line-through text-gray-500">
                                  {todo.title}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap text-xs mt-1">
                                <span className={`px-1.5 py-0.5 rounded border ${CATEGORY_COLOR[todo.category] ?? CATEGORY_COLOR.personal}`}>
                                  {CATEGORY_LABEL[todo.category]}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded border ${PRIORITY_COLOR[todo.priority] ?? PRIORITY_COLOR[3]}`}>
                                  {PRIORITY_LABEL[todo.priority] ?? "中"}
                                </span>
                                <span className="text-gray-600">⏱ {todo.estimated_minutes}分</span>
                                {todo.goal_id && weeklyGoals.find(g => g.id === todo.goal_id) && (
                                  <span className="px-1.5 py-0.5 rounded border border-purple-700 text-purple-400 bg-purple-950/40">
                                    🎯 {weeklyGoals.find(g => g.id === todo.goal_id)?.title.slice(0, 12)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleEdit(todo)}
                                className="text-sm px-1.5 py-1 rounded text-gray-600 hover:text-blue-400 transition-colors"
                                title="編集"
                              >
                                ✎
                              </button>
                              <button
                                onClick={() => handleDelete(todo.id)}
                                className="text-gray-700 hover:text-red-500 text-sm transition-colors"
                                title="削除"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
