"use client";

import { useState, useEffect, useCallback } from "react";
import { RoutineV2 } from "@/types/v2";
import { CATEGORY_EMOJI, CATEGORY_LABEL } from "@/types/v2";

const CATEGORIES = ["fitness", "engineer", "video", "english", "investment", "ai", "personal", "life_design"];

export default function SettingsTab() {
  const [routines, setRoutines] = useState<RoutineV2[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "fitness",
    estimated_minutes: 30,
    scheduled_start: "06:30",
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });

  const fetchRoutines = useCallback(async () => {
    try {
      const res = await fetch("/api/v2/routines");
      if (res.ok) {
        const data = await res.json();
        setRoutines(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching routines:", error);
    }
  }, []);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    setLoading(true);
    try {
      const url = editingId ? `/api/v2/routines/${editingId}` : "/api/v2/routines";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          estimated_minutes: formData.estimated_minutes,
          scheduled_start: formData.scheduled_start,
          weekday_types: {
            monday: formData.monday,
            tuesday: formData.tuesday,
            wednesday: formData.wednesday,
            thursday: formData.thursday,
            friday: formData.friday,
            saturday: formData.saturday,
            sunday: formData.sunday,
          },
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        setFormData({
          title: "",
          category: "fitness",
          estimated_minutes: 30,
          scheduled_start: "06:30",
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        });
        fetchRoutines();
      } else {
        const error = await res.json();
        console.error("Error:", error);
      }
    } catch (error) {
      console.error("Error submitting routine:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (routine: RoutineV2) => {
    setEditingId(routine.id);
    setFormData({
      title: routine.title,
      category: routine.category,
      estimated_minutes: routine.estimated_minutes,
      scheduled_start: routine.scheduled_start,
      monday: routine.weekday_types.monday || false,
      tuesday: routine.weekday_types.tuesday || false,
      wednesday: routine.weekday_types.wednesday || false,
      thursday: routine.weekday_types.thursday || false,
      friday: routine.weekday_types.friday || false,
      saturday: routine.weekday_types.saturday || false,
      sunday: routine.weekday_types.sunday || false,
    });
    setShowForm(true);
  };

  const handleToggleEnabled = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/v2/routines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !currentStatus }),
      });
      if (res.ok) {
        fetchRoutines();
      }
    } catch (error) {
      console.error("Error toggling routine:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このルーティンを削除しますか？")) return;

    try {
      const res = await fetch(`/api/v2/routines/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchRoutines();
      }
    } catch (error) {
      console.error("Error deleting routine:", error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: "",
      category: "fitness",
      estimated_minutes: 30,
      scheduled_start: "06:30",
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-amber-300">📋 毎日のルーティン設定</h2>
        <button
          onClick={() => (showForm ? handleCancel() : setShowForm(true))}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
        >
          {showForm ? "▲ 閉じる" : "+ 新規追加"}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-gray-800 rounded-xl p-4 space-y-3 border border-gray-700">
          <input
            type="text"
            placeholder="ルーティン名 *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">カテゴリ</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">見積時間</label>
              <input
                type="number"
                value={formData.estimated_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_minutes: Number(e.target.value) })
                }
                min={5}
                step={5}
                className="w-full bg-gray-700 text-white rounded-lg px-2 py-1.5 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">開始時刻</label>
            <input
              type="time"
              value={formData.scheduled_start}
              onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-500 block">実行曜日</label>
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                {["月", "火", "水", "木", "金"].map((day, i) => {
                  const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
                  const dayKey = dayKeys[i];
                  return (
                    <label key={day} className="flex items-center gap-1 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData[dayKey]}
                        onChange={(e) => setFormData({ ...formData, [dayKey]: e.target.checked })}
                        className="w-4 h-4"
                      />
                      {day}
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2 flex-wrap">
                {["土", "日"].map((day, i) => {
                  const dayKeys = ["saturday", "sunday"] as const;
                  const dayKey = dayKeys[i];
                  return (
                    <label key={day} className="flex items-center gap-1 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData[dayKey]}
                        onChange={(e) => setFormData({ ...formData, [dayKey]: e.target.checked })}
                        className="w-4 h-4"
                      />
                      {day}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.title.trim()}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              {loading ? "保存中..." : editingId ? "更新" : "追加"}
            </button>
          </div>
        </div>
      )}

      {/* Routines List */}
      {routines.length > 0 ? (
        <div className="space-y-2">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {CATEGORY_EMOJI[routine.category]} {routine.title}
                  </span>
                  <span className="text-xs text-gray-500">({routine.scheduled_start})</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <span>{CATEGORY_LABEL[routine.category]}</span>
                  <span>•</span>
                  <span>
                    {(() => {
                      const days = routine.weekday_types;
                      const allDays = [days.monday, days.tuesday, days.wednesday, days.thursday, days.friday, days.saturday, days.sunday];
                      const selectedDays = allDays.filter(d => d).length;
                      if (selectedDays === 7) return "毎日";
                      if (selectedDays === 5 && days.monday && days.tuesday && days.wednesday && days.thursday && days.friday) return "平日のみ";
                      if (selectedDays === 2 && days.saturday && days.sunday) return "休日のみ";
                      const dayLabels = ["月", "火", "水", "木", "金", "土", "日"];
                      return dayLabels.filter((_, i) => allDays[i]).join("");
                    })()}
                  </span>
                  <span>•</span>
                  <span>{routine.estimated_minutes}分</span>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => handleToggleEnabled(routine.id, routine.is_enabled)}
                  className={`px-2 py-1 text-xs rounded transition-colors text-white ${
                    routine.is_enabled ? "bg-green-700 hover:bg-green-600" : "bg-gray-600 hover:bg-gray-500"
                  }`}
                >
                  {routine.is_enabled ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => handleEdit(routine)}
                  className="px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded transition-colors"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(routine.id)}
                  className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <p>ルーティンが設定されていません</p>
          <p className="text-xs mt-1">「新規追加」ボタンからルーティンを追加してください</p>
        </div>
      )}
    </div>
  );
}
