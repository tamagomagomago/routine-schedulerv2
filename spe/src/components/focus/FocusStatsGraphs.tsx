"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface FocusStatsGraphsProps {
  userId: string;
  period?: "week" | "month";
}

interface StatsData {
  period: string;
  daily_breakdown: Record<string, number>;
  mode_breakdown: Record<string, number>;
  total_minutes: number;
}

export default function FocusStatsGraphs({ userId, period = "week" }: FocusStatsGraphsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<"week" | "month">(period);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/focus/stats?period=${currentPeriod}&user_id=${userId}`);
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error("Failed to fetch stats:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId, currentPeriod]);

  if (loading) {
    return <div className="text-gray-400">読込中...</div>;
  }

  if (!stats) {
    return null;
  }

  // Format daily data for line chart
  const dailyData = Object.entries(stats.daily_breakdown).map(([date, minutes]) => {
    const dateObj = new Date(date + "T00:00:00");
    return {
      date: dateObj.toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
      時間: Math.round(minutes / 60 * 10) / 10, // Convert to hours
      minutes,
    };
  });

  // Format mode data for bar chart
  const modeData = Object.entries(stats.mode_breakdown).map(([mode, minutes]) => ({
    mode,
    時間: Math.round(minutes / 60 * 10) / 10,
    minutes,
  }));

  const totalHours = Math.round(stats.total_minutes / 60 * 10) / 10;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">📊 集中統計</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPeriod("week")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              currentPeriod === "week"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            週間
          </button>
          <button
            onClick={() => setCurrentPeriod("month")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              currentPeriod === "month"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            月間
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 p-3 bg-gray-700 rounded">
        <p className="text-gray-300">
          合計集中時間: <span className="font-bold text-lg">{totalHours}時間</span> ({stats.total_minutes}分)
        </p>
      </div>

      {/* Daily Line Chart */}
      {dailyData.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">日別トレンド</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" label={{ value: "時間", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #4b5563" }}
                labelStyle={{ color: "#f3f4f6" }}
              />
              <Line
                type="monotone"
                dataKey="時間"
                stroke="#3b82f6"
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mode Breakdown Bar Chart */}
      {modeData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">モード別内訳</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={modeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
              <XAxis dataKey="mode" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" label={{ value: "時間", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #4b5563" }}
                labelStyle={{ color: "#f3f4f6" }}
              />
              <Bar dataKey="時間" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
