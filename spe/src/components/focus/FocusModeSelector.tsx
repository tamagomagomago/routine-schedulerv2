"use client";

import { useState } from "react";
import { FocusMode } from "@/types";

interface FocusModeSelectorProps {
  modes: FocusMode[];
  selectedMode: string;
  onSelectMode: (mode: string) => void;
  userId: string;
  onModesChange?: () => void;
}

export default function FocusModeSelector({
  modes,
  selectedMode,
  onSelectMode,
  userId,
  onModesChange,
}: FocusModeSelectorProps) {
  const [showAddMode, setShowAddMode] = useState(false);
  const [newModeName, setNewModeName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddMode = async () => {
    if (!newModeName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/focus/modes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          mode_name: newModeName.trim(),
          color_hex: "#8b5cf6",
        }),
      });
      if (res.ok) {
        setNewModeName("");
        setShowAddMode(false);
        onModesChange?.();
      }
    } catch (e) {
      console.error("Failed to add mode:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMode = async (modeId: number, modeName: string) => {
    if (!confirm(`「${modeName}」を削除しますか？`)) return;
    try {
      const res = await fetch(`/api/focus/modes/${modeId}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      if (res.ok) {
        if (selectedMode === modeName) {
          onSelectMode(modes[0]?.mode_name || "FOOH制作");
        }
        onModesChange?.();
        alert(`「${modeName}」を削除しました`);
      } else {
        const error = await res.json();
        alert(`削除に失敗しました: ${error.error || "不明なエラー"}`);
      }
    } catch (e) {
      console.error("Failed to delete mode:", e);
      alert(`削除エラー: ${String(e)}`);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-3">モード選択:</label>

      {/* Mode Dropdown */}
      <select
        value={selectedMode}
        onChange={(e) => onSelectMode(e.target.value)}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white mb-3 focus:outline-none focus:border-blue-500"
      >
        {modes.map((mode) => (
          <option key={mode.mode_name} value={mode.mode_name}>
            {mode.mode_name}
          </option>
        ))}
      </select>

      {/* Mode Buttons with Delete */}
      <div className="grid grid-cols-2 gap-2">
        {modes.map((mode) => (
          <div key={mode.mode_name} className="relative group">
            <button
              onClick={() => onSelectMode(mode.mode_name)}
              className={`w-full py-2 px-3 rounded border-2 transition-all text-sm ${
                selectedMode === mode.mode_name
                  ? `border-opacity-100 text-white`
                  : "border-gray-600 bg-gray-700 hover:border-gray-500"
              }`}
              style={{
                borderColor:
                  selectedMode === mode.mode_name ? mode.color_hex : undefined,
                backgroundColor:
                  selectedMode === mode.mode_name ? `${mode.color_hex}33` : undefined,
              }}
            >
              {mode.mode_name}
            </button>
            {/* Delete button on hover */}
            <button
              onClick={() => handleDeleteMode(mode.id, mode.mode_name)}
              className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white text-xs rounded-full w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
              title="削除"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add Custom Mode */}
      {showAddMode ? (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={newModeName}
            onChange={(e) => setNewModeName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddMode();
              if (e.key === "Escape") setShowAddMode(false);
            }}
            placeholder="モード名を入力"
            className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <button
            onClick={handleAddMode}
            disabled={loading}
            className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors disabled:opacity-50"
          >
            追加
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddMode(true)}
          className="w-full mt-2 py-2 px-3 bg-gray-700 hover:bg-gray-600 border border-dashed border-gray-600 rounded text-sm text-gray-400 transition-colors"
        >
          + 新規モード
        </button>
      )}
    </div>
  );
}
