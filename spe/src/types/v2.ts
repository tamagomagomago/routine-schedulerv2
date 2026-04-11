export type V2Category = "vfx" | "english" | "engineer" | "investment" | "fitness" | "personal";
export type V2PeriodType = "annual" | "monthly" | "weekly";

export const CATEGORY_LABEL: Record<string, string> = {
  vfx: "映像",
  english: "英語",
  engineer: "エンジニア",
  investment: "投資",
  fitness: "フィットネス",
  personal: "個人",
};

export const CATEGORY_EMOJI: Record<string, string> = {
  vfx: "🎬",
  english: "🗣️",
  engineer: "📐",
  investment: "💰",
  fitness: "💪",
  personal: "⭐",
};

export const CATEGORY_COLOR: Record<string, string> = {
  vfx: "text-purple-300 bg-purple-900/40 border-purple-700",
  english: "text-blue-300 bg-blue-900/40 border-blue-700",
  engineer: "text-teal-300 bg-teal-900/40 border-teal-700",
  investment: "text-green-300 bg-green-900/40 border-green-700",
  fitness: "text-orange-300 bg-orange-900/40 border-orange-700",
  personal: "text-gray-300 bg-gray-700/40 border-gray-600",
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
