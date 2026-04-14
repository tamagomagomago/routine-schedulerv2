"use client";

import { useState } from "react";
import TodayTab from "@/components/v2/TodayTab";
import GoalsTab from "@/components/v2/GoalsTab";
import FocusTab from "@/components/v2/FocusTab";
import StatsTab from "@/components/v2/StatsTab";
import SettingsTab from "@/components/v2/SettingsTab";
import { TodoV2 } from "@/types/v2";

type Tab = "today" | "goals" | "focus" | "stats" | "settings";

const TABS: { id: Tab; label: string; emoji: string; color: string; activeColor: string }[] = [
  { id: "today", label: "今日", emoji: "📅", color: "text-gray-500", activeColor: "text-blue-400" },
  { id: "goals", label: "目標", emoji: "🎯", color: "text-gray-500", activeColor: "text-purple-400" },
  { id: "focus", label: "集中", emoji: "⏱", color: "text-gray-500", activeColor: "text-green-400" },
  { id: "stats", label: "統計", emoji: "📊", color: "text-gray-500", activeColor: "text-yellow-400" },
  { id: "settings", label: "設定", emoji: "⚙️", color: "text-gray-500", activeColor: "text-orange-400" },
];

export default function V2Page() {
  const [currentTab, setCurrentTab] = useState<Tab>("today");
  const [focusTodo, setFocusTodo] = useState<TodoV2 | null>(null);

  const handleStartFocus = (todo: TodoV2) => {
    setFocusTodo(todo);
    setCurrentTab("focus");
  };

  const handleTabChange = (tab: Tab) => {
    if (tab !== "focus") setFocusTodo(null);
    setCurrentTab(tab);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-white font-bold text-base tracking-tight">
            {currentTab === "today" && "📅 今日のタスク"}
            {currentTab === "goals" && "🎯 目標管理"}
            {currentTab === "focus" && "⏱ 集中タイマー"}
            {currentTab === "stats" && "📊 統計・レビュー"}
            {currentTab === "settings" && "⚙️ 毎日のルーティン設定"}
          </h1>
          <span className="text-gray-600 text-xs">V2</span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-lg mx-auto w-full overflow-y-auto">
        {currentTab === "today" && (
          <TodayTab onStartFocus={handleStartFocus} />
        )}
        {currentTab === "goals" && (
          <GoalsTab />
        )}
        {currentTab === "focus" && (
          <FocusTab initialTodo={focusTodo} />
        )}
        {currentTab === "stats" && (
          <StatsTab />
        )}
        {currentTab === "settings" && (
          <SettingsTab />
        )}
      </main>

      {/* ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-gray-950/95 backdrop-blur border-t border-gray-800">
        <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2 pb-safe">
          {TABS.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors ${
                  isActive ? "bg-gray-800/60" : "hover:bg-gray-800/30"
                }`}
              >
                <span className="text-xl leading-none">{tab.emoji}</span>
                <span className={`text-xs font-medium ${isActive ? tab.activeColor : tab.color}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className={`w-1 h-1 rounded-full ${tab.activeColor.replace("text-", "bg-")}`} />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
