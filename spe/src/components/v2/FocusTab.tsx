"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TodoV2, FocusSessionV2, CATEGORY_EMOJI, CATEGORY_COLOR } from "@/types/v2";

const TODAY = new Date().toISOString().split("T")[0];
const PRESET_MINUTES = [15, 25, 50, 90];

interface FocusTabProps {
  initialTodo?: TodoV2 | null;
}

export default function FocusTab({ initialTodo }: FocusTabProps) {
  const [todos, setTodos] = useState<TodoV2[]>([]);
  const [sessions, setSessions] = useState<FocusSessionV2[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<TodoV2 | null>(initialTodo ?? null);
  const [customTitle, setCustomTitle] = useState("");
  const [customCategory, setCustomCategory] = useState("personal");
  const [plannedMinutes, setPlannedMinutes] = useState(25);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
    const [todosRes, sessionsRes] = await Promise.all([
      fetch(`/api/v2/todos?date=${TODAY}&include_unscheduled=true`),
      fetch(`/api/v2/focus?date=${TODAY}`),
    ]);
    if (todosRes.ok) setTodos(await todosRes.json());
    if (sessionsRes.ok) setSessions(await sessionsRes.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (initialTodo) setSelectedTodo(initialTodo);
  }, [initialTodo]);

  // タイマー処理
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const secs = Math.floor((now - startTimeRef.current) / 1000);
        setElapsed(secs);

        // 時間になったら通知
        if (secs >= plannedMinutes * 60 && !isFinished) {
          setIsFinished(true);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("⏰ 集中時間終了！", { body: `${plannedMinutes}分の集中が完了しました` });
          }
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, plannedMinutes, isFinished]);

  const handleStart = async () => {
    // 通知許可を取得
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    const category = selectedTodo?.category ?? customCategory;
    const title = (selectedTodo?.title ?? customTitle) || "集中作業";

    const res = await fetch("/api/v2/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        todo_id: selectedTodo?.id ?? null,
        todo_title: title,
        category,
        planned_minutes: plannedMinutes,
      }),
    });
    if (res.ok) {
      const session = await res.json();
      setActiveSessionId(session.id);
    }

    startTimeRef.current = Date.now();
    setElapsed(0);
    setIsRunning(true);
    setIsFinished(false);
  };

  const handlePause = () => setIsRunning(false);
  const handleResume = () => {
    startTimeRef.current = Date.now() - elapsed * 1000;
    setIsRunning(true);
  };

  const handleStop = async () => {
    setIsRunning(false);
    if (activeSessionId) {
      await fetch(`/api/v2/focus/${activeSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual_minutes: Math.round(elapsed / 60) }),
      });
      setActiveSessionId(null);
    }
    setElapsed(0);
    setIsFinished(false);
    fetchData();
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsed(0);
    setIsFinished(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const remaining = Math.max(0, plannedMinutes * 60 - elapsed);
  const progress = Math.min(100, (elapsed / (plannedMinutes * 60)) * 100);
  const remainMins = Math.floor(remaining / 60);
  const remainSecs = remaining % 60;
  const totalFocusToday = sessions.reduce((s, sess) => s + (sess.actual_minutes ?? sess.planned_minutes ?? 0), 0);

  // カテゴリ別集計
  const byCat: Record<string, number> = {};
  sessions.forEach((s) => { byCat[s.category] = (byCat[s.category] ?? 0) + (s.actual_minutes ?? s.planned_minutes ?? 0); });

  const circumference = 2 * Math.PI * 88; // r=88

  return (
    <div className="pb-24 px-4 pt-4">
      {/* タスク選択 */}
      {!isRunning && !isFinished && (
        <div className="mb-6 space-y-2">
          <p className="text-gray-400 text-sm font-medium">何に集中する？</p>
          <select
            value={selectedTodo?.id ?? "custom"}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setSelectedTodo(null);
              } else {
                setSelectedTodo(todos.find((t) => t.id === Number(e.target.value)) ?? null);
              }
            }}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2.5 text-sm"
          >
            <option value="custom">✏ 直接入力</option>
            {todos.map((t) => (
              <option key={t.id} value={t.id}>
                {CATEGORY_EMOJI[t.category] ?? ""} {t.title}
              </option>
            ))}
          </select>
          {!selectedTodo && (
            <div className="flex gap-2">
              <input
                placeholder="集中する内容を入力"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2 text-sm"
              />
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-xl px-2 py-2 text-sm"
              >
                {["video", "english", "investment", "ai", "personal"].map((c) => (
                  <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* タイマー設定 */}
      {!isRunning && !isFinished && (
        <div className="flex gap-2 justify-center mb-6">
          {PRESET_MINUTES.map((m) => (
            <button
              key={m}
              onClick={() => setPlannedMinutes(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${plannedMinutes === m ? "bg-green-700 text-white border-green-600" : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"}`}
            >
              {m}分
            </button>
          ))}
        </div>
      )}

      {/* 円形タイマー */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-52 h-52">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="88" fill="none" stroke="#1f2937" strokeWidth="10" />
            <circle
              cx="100" cy="100" r="88"
              fill="none"
              stroke={isFinished ? "#22c55e" : "#3b82f6"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isFinished ? (
              <>
                <span className="text-4xl">🎉</span>
                <p className="text-green-400 font-bold mt-1">完了！</p>
              </>
            ) : (
              <>
                <p className="text-4xl font-bold text-white tabular-nums">
                  {String(remainMins).padStart(2, "0")}:{String(remainSecs).padStart(2, "0")}
                </p>
                <p className="text-gray-500 text-xs mt-1">残り時間</p>
              </>
            )}
          </div>
        </div>

        {/* 集中中のタスク名 */}
        {(isRunning || isFinished) && (
          <p className="text-gray-400 text-sm mt-2 text-center">
            {selectedTodo ? `${CATEGORY_EMOJI[selectedTodo.category] ?? ""} ${selectedTodo.title}` : customTitle || "集中作業"}
          </p>
        )}
      </div>

      {/* コントロールボタン */}
      <div className="flex justify-center gap-3 mb-8">
        {!isRunning && !activeSessionId && !isFinished && (
          <button
            onClick={handleStart}
            disabled={!selectedTodo && !customTitle.trim()}
            className="px-8 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl font-bold text-lg transition-colors"
          >
            ▶ 開始
          </button>
        )}
        {isRunning && (
          <>
            <button onClick={handlePause} className="px-6 py-3 bg-yellow-700 hover:bg-yellow-600 text-white rounded-xl font-medium transition-colors">
              ⏸ 一時停止
            </button>
            <button onClick={handleStop} className="px-6 py-3 bg-red-800 hover:bg-red-700 text-white rounded-xl font-medium transition-colors">
              ■ 終了
            </button>
          </>
        )}
        {!isRunning && activeSessionId && !isFinished && (
          <>
            <button onClick={handleResume} className="px-6 py-3 bg-green-700 hover:bg-green-600 text-white rounded-xl font-medium transition-colors">
              ▶ 再開
            </button>
            <button onClick={handleStop} className="px-6 py-3 bg-red-800 hover:bg-red-700 text-white rounded-xl font-medium transition-colors">
              ■ 終了
            </button>
          </>
        )}
        {isFinished && (
          <>
            <button onClick={handleStop} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors">
              ✓ 完了して記録
            </button>
            <button onClick={handleReset} className="px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-medium transition-colors">
              ↺ リセット
            </button>
          </>
        )}
      </div>

      {/* 今日の集中サマリー */}
      {sessions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm font-medium mb-3">今日の集中 合計 {totalFocusToday}分</p>
          <div className="space-y-1.5">
            {Object.entries(byCat).map(([cat, min]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-sm w-5">{CATEGORY_EMOJI[cat] ?? "📌"}</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${totalFocusToday > 0 ? (min / totalFocusToday) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-12 text-right">{min}分</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
