"use client";

import { useState, useEffect } from "react";
import { FocusTodayStats } from "@/types";

interface FocusDashboardProps {
  userId: string;
}

export default function FocusDashboard({ userId }: FocusDashboardProps) {
  const [stats, setStats] = useState<FocusTodayStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/focus/today?user_id=${userId}`);
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error("Failed to fetch focus stats:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-gray-400">
        読込中...
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const progressPercent = Math.min(
    (stats.total_minutes / stats.today_goal_minutes) * 100,
    100
  );

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <h3 className="text-lg font-bold mb-4">📊 本日の集中統計</h3>

      {/* Total Minutes */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-300">合計時間: <span className="font-bold text-lg">{stats.total_minutes}分</span></span>
          <span className="text-sm text-gray-500">目標: {stats.today_goal_minutes}分</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {Math.round(progressPercent)}% 達成
        </p>
      </div>

      {/* Mode Breakdown */}
      {stats.breakdown_by_mode && Object.keys(stats.breakdown_by_mode).length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">モード別内訳:</p>
          <div className="space-y-1">
            {Object.entries(stats.breakdown_by_mode).map(([mode, minutes]) => (
              <div key={mode} className="flex justify-between text-sm">
                <span className="text-gray-300">▓ {mode}</span>
                <span className="font-medium text-gray-200">{minutes}分</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Count */}
      <div className="pt-3 border-t border-gray-700 text-sm text-gray-400">
        <p>セッション数: <span className="font-bold text-gray-200">{stats.session_count}回</span></p>
        {stats.session_count > 0 && (
          <p>
            平均: <span className="font-bold text-gray-200">
              {Math.round(stats.total_minutes / stats.session_count)}分
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
