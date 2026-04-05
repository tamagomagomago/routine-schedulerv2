"use client";

import { useState, useEffect } from "react";
import FocusSessionScreen from "@/components/focus/FocusSessionScreen";
import FocusDashboard from "@/components/focus/FocusDashboard";
import FocusStatsGraphs from "@/components/focus/FocusStatsGraphs";
import Link from "next/link";

export default function FocusPage() {
  const [userId, setUserId] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Get or create user ID from localStorage
    let id = localStorage.getItem("userId");
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem("userId", id);
    }
    setUserId(id);
    setMounted(true);
  }, []);

  if (!mounted || !userId) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-100">読込中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 bg-gray-800 border-b border-gray-700 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">⏱ 集中アプリ</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            ← 戻る
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Session Screen */}
          <div className="lg:col-span-2">
            <FocusSessionScreen userId={userId} />
          </div>

          {/* Right Column: Stats */}
          <div className="space-y-6">
            <FocusDashboard userId={userId} />
            <FocusStatsGraphs userId={userId} period="week" />
          </div>
        </div>
      </div>
    </div>
  );
}
