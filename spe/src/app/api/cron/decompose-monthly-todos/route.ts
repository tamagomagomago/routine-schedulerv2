import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 月別TODOを週別に分解し、due_dateを割り当てるcronエンドポイント
 * 毎月1日に実行される
 *
 * 動作:
 * 1. 当月に生成された月別TODOを取得（due_date が null のもの）
 * 2. 各TODOに週別の due_date を割り当て
 * 3. 段階的な難度分配に基づいて週を割り当て
 */
export async function GET(request: Request) {
  // Vercel Cron の検証
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;

    // 当月に生成された月別TODOを取得（due_date が null のもの）
    const { data: todosByGoal, error: fetchError } = await supabase
      .from("todos")
      .select("id, title, description, category, estimated_minutes, priority")
      .is("due_date", null)
      .ilike("description", `%Goal ID:%`)
      .gte("created_at", `${currentMonth}-01T00:00:00Z`)
      .lte("created_at", `${currentMonth}-31T23:59:59Z`);

    if (fetchError) throw fetchError;

    if (!todosByGoal || todosByGoal.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No monthly TODOs found to decompose",
      });
    }

    // TODOを目標別にグループ化
    const goalGroups: Record<string, typeof todosByGoal> = {};
    for (const todo of todosByGoal) {
      // description から Goal ID を抽出
      const goalIdMatch = todo.description?.match(/Goal ID: (\d+)/);
      if (goalIdMatch) {
        const goalId = goalIdMatch[1];
        if (!goalGroups[goalId]) {
          goalGroups[goalId] = [];
        }
        goalGroups[goalId].push(todo);
      }
    }

    let updatedCount = 0;

    // 各目標のTODOを4週に分配
    for (const goalId of Object.keys(goalGroups)) {
      const todos = goalGroups[goalId];
      const weekDates = getWeekDatesForMonth(currentYear, currentMonthNum);

      // TODOを週に分配（難度配分: W1: 20%, W2-3: 60%, W4: 20%）
      const weekAssignments = assignTodosToWeeks(todos, weekDates);

      // 各TODOの due_date を更新
      for (const assignment of weekAssignments) {
        const { error: updateError } = await supabase
          .from("todos")
          .update({ due_date: assignment.dueDate })
          .eq("id", assignment.todoId);

        if (!updateError) {
          updatedCount++;
        }
      }
    }

    // Pushover 通知
    try {
      await fetch("https://api.pushover.net/1/messages.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: process.env.PUSHOVER_APP_TOKEN,
          user: process.env.PUSHOVER_USER_KEY,
          message: `✅ 月別TODOを週別に分解しました（${updatedCount}件）`,
          priority: 0,
        }),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      processed: updatedCount,
      message: `Decomposed ${updatedCount} monthly TODOs into weekly tasks`,
    });
  } catch (err) {
    console.error("Cron decomposition failed:", err);
    return NextResponse.json(
      { error: "Failed to process cron task", details: String(err) },
      { status: 500 }
    );
  }
}

/**
 * 指定月の4週間の日付を取得
 * Week 1: 1日～7日
 * Week 2: 8日～14日
 * Week 3: 15日～21日
 * Week 4: 22日～末日
 */
function getWeekDatesForMonth(year: number, month: number): Record<number, string> {
  const dates: Record<number, string> = {};

  // Week 1-3: 固定
  dates[1] = `${year}-${String(month).padStart(2, "0")}-07`;
  dates[2] = `${year}-${String(month).padStart(2, "0")}-14`;
  dates[3] = `${year}-${String(month).padStart(2, "0")}-21`;

  // Week 4: 月末
  const lastDay = new Date(year, month, 0).getDate();
  dates[4] = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return dates;
}

/**
 * TODOを週に割り当て（難度配分考慮）
 * 難度配分:
 * - Week 1: 簡単（20%）
 * - Week 2-3: 中程度（60%）
 * - Week 4: 難しい（20%）
 */
function assignTodosToWeeks(
  todos: any[],
  weekDates: Record<number, string>
): Array<{ todoId: number; dueDate: string }> {
  const assignments: Array<{ todoId: number; dueDate: string }> = [];

  if (todos.length === 0) return assignments;

  // TODOを優先度でソート（高→中→低）
  const sorted = [...todos].sort((a, b) => (a.priority || 3) - (b.priority || 3));

  // 難度配分に基づいて週を割り当て
  const week1Count = Math.ceil(sorted.length * 0.2);
  const week234Count = sorted.length - week1Count;
  const week2Count = Math.ceil(week234Count / 2);
  const week3Count = Math.floor(week234Count / 2);

  let idx = 0;

  // Week 1（最も簡単なタスク）
  for (let i = 0; i < week1Count && idx < sorted.length; i++, idx++) {
    assignments.push({
      todoId: sorted[idx].id,
      dueDate: weekDates[1],
    });
  }

  // Week 2（中程度）
  for (let i = 0; i < week2Count && idx < sorted.length; i++, idx++) {
    assignments.push({
      todoId: sorted[idx].id,
      dueDate: weekDates[2],
    });
  }

  // Week 3（中程度）
  for (let i = 0; i < week3Count && idx < sorted.length; i++, idx++) {
    assignments.push({
      todoId: sorted[idx].id,
      dueDate: weekDates[3],
    });
  }

  // Week 4（最も難しいタスク）
  while (idx < sorted.length) {
    assignments.push({
      todoId: sorted[idx].id,
      dueDate: weekDates[4],
    });
    idx++;
  }

  return assignments;
}
