export type V2Category = "video" | "english" | "investment" | "ai" | "personal" | "fitness" | "engineer" | "vfx" | "life_design";
export type V2PeriodType = "annual" | "monthly" | "weekly";

export const CATEGORY_LABEL: Record<string, string> = {
  video: "動画制作",
  english: "英語",
  investment: "投資",
  ai: "生成AI",
  personal: "個人",
  life_design: "人生設計",
  // レガシーカテゴリー（後方互換性）
  fitness: "フィットネス",
  engineer: "エンジニア",
  vfx: "映像",
};

export const CATEGORY_EMOJI: Record<string, string> = {
  video: "🎥",
  english: "🗣️",
  investment: "💰",
  ai: "🤖",
  personal: "⭐",
  life_design: "🎯",
  // レガシーカテゴリー（後方互換性）
  fitness: "💪",
  engineer: "📐",
  vfx: "🎬",
};

export const CATEGORY_COLOR: Record<string, string> = {
  video: "text-purple-300 bg-purple-900/40 border-purple-700",
  english: "text-blue-300 bg-blue-900/40 border-blue-700",
  investment: "text-green-300 bg-green-900/40 border-green-700",
  ai: "text-pink-300 bg-pink-900/40 border-pink-700",
  personal: "text-gray-300 bg-gray-700/40 border-gray-600",
  life_design: "text-indigo-300 bg-indigo-900/40 border-indigo-700",
  // レガシーカテゴリー（後方互換性）
  fitness: "text-orange-300 bg-orange-900/40 border-orange-700",
  engineer: "text-teal-300 bg-teal-900/40 border-teal-700",
  vfx: "text-purple-300 bg-purple-900/40 border-purple-700",
};

export const PRIORITY_LABEL: Record<number, string> = { 1: "高", 3: "中", 5: "低" };
export const PRIORITY_COLOR: Record<number, string> = {
  1: "text-red-300 bg-red-900/60 border-red-700",
  3: "text-yellow-300 bg-yellow-900/60 border-yellow-700",
  5: "text-green-300 bg-green-900/60 border-green-700",
};

export interface GoalV2 {
  id: number;
  user_id: string;
  title: string;
  category: string;
  period_type: V2PeriodType;
  parent_id?: number | null;
  target_value?: number | null;
  current_value: number;
  unit?: string | null;
  start_date: string;
  end_date: string;
  is_achieved: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalV2 {
  title: string;
  category: string;
  period_type: V2PeriodType;
  parent_id?: number | null;
  target_value?: number;
  current_value?: number;
  unit?: string;
  start_date: string;
  end_date: string;
}

export interface TodoV2 {
  id: number;
  user_id: string;
  title: string;
  category: string;
  priority: number;
  estimated_minutes: number;
  actual_minutes?: number | null;
  is_completed: boolean;
  is_mit: boolean;
  scheduled_date?: string | null;
  scheduled_start?: string | null;
  goal_id?: number | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoV2 {
  title: string;
  category: string;
  priority?: number;
  estimated_minutes?: number;
  is_mit?: boolean;
  scheduled_date?: string;
  scheduled_start?: string;
  goal_id?: number;
}

export interface FocusSessionV2 {
  id: number;
  user_id: string;
  todo_id?: number | null;
  todo_title?: string | null;
  category: string;
  planned_minutes: number;
  actual_minutes?: number | null;
  started_at: string;
  ended_at?: string | null;
  created_at: string;
}

export interface WeeklyReviewV2 {
  id: number;
  user_id: string;
  week_start: string;
  achievement_rate?: number | null;
  memo?: string | null;
  created_at: string;
}

export interface StatsV2 {
  focus_by_category: Record<string, number>; // category → total minutes
  weekly_focus: { week: string; minutes: number }[];
  goal_achievement_trend: { week: string; rate: number }[];
}
