"use client";

import { useState, useEffect } from "react";
import { Todo } from "@/types";

interface FocusTaskSelectorProps {
  onTaskSelect: (task: Todo | null) => void;
  selectedTask: Todo | null;
}

export default function FocusTaskSelector({
  onTaskSelect,
  selectedTask,
}: FocusTaskSelectorProps) {
  const [todayHighPriorityTodos, setTodayHighPriorityTodos] = useState<Todo[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTodos = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(`/api/todos?is_today=true`);
        if (!res.ok) throw new Error("Failed to fetch todos");
        const todos = await res.json();

        // 今日のTODOで優先度が「高」（priority === 1）のもの
        const highPriority = (Array.isArray(todos) ? todos : []).filter(
          (t: Todo) => t.priority === 1 && !t.is_completed
        );
        setTodayHighPriorityTodos(highPriority);
      } catch (error) {
        console.error("Failed to fetch today's high-priority todos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-200 mb-2">
          🎯 シングルフォーカスタスク
        </h3>
        <p className="text-xs text-gray-500">
          今日の優先度高タスクの中から1つ選択（オプション）
        </p>
      </div>

      {loading && <p className="text-xs text-gray-400">読込中...</p>}

      {!loading && todayHighPriorityTodos.length === 0 && (
        <p className="text-xs text-gray-500">
          今日の優先度高タスクがありません
        </p>
      )}

      {!loading && todayHighPriorityTodos.length > 0 && (
        <div className="space-y-2">
          {/* Clear selection button */}
          {selectedTask && (
            <button
              onClick={() => onTaskSelect(null)}
              className="w-full px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors"
            >
              ✕ 選択を解除
            </button>
          )}

          {/* Task list */}
          {todayHighPriorityTodos.map((todo) => (
            <button
              key={todo.id}
              onClick={() => onTaskSelect(todo)}
              className={`w-full px-3 py-2 text-xs rounded transition-colors text-left ${
                selectedTask?.id === todo.id
                  ? "bg-red-600 text-white font-semibold"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0">
                  {selectedTask?.id === todo.id ? "✓" : "◇"}
                </span>
                <div className="flex-1">
                  <p className="font-medium truncate">{todo.title}</p>
                  <p className="text-gray-400 text-xs">
                    {todo.estimated_minutes}分
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
