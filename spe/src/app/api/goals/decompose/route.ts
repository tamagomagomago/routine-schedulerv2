import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decomposeOKRWithClaude } from "@/lib/claudeTaskDecomposer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { goal_id, goal, breakdown_config } = await req.json();

    if (!goal_id || !goal || !breakdown_config) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Claude で分解
    const decomposition = await decomposeOKRWithClaude(goal, breakdown_config);

    // トランザクション内で weekly_tasks と weekly_subtasks を作成
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // 既存タスクを削除
    await supabase.from("weekly_tasks").delete().eq("goal_id", goal_id);

    // 新しいタスクを作成
    const weeklyTasks = [];
    const monthlyTodos = [];

    for (const weeklyBreakdown of decomposition.weeklyBreakdowns) {
      for (const task of weeklyBreakdown.tasks) {
        const { data: insertedTask, error: taskError } = await supabase
          .from("weekly_tasks")
          .insert({
            goal_id,
            user_id: "default_user",
            week_number: weeklyBreakdown.week,
            month: `${monthStr}-01`,
            category: task.category,
            allocated_minutes: task.allocated_minutes,
            actual_minutes: 0,
          })
          .select();

        if (taskError) throw taskError;

        // サブタスクを作成
        if (insertedTask && insertedTask[0]) {
          const subtasks = task.subtasks.map((name) => ({
            weekly_task_id: insertedTask[0].id,
            name,
            estimated_minutes: Math.round(
              task.allocated_minutes / task.subtasks.length
            ),
            actual_minutes: 0,
            completed: false,
          }));

          const { error: subtaskError } = await supabase
            .from("weekly_subtasks")
            .insert(subtasks);

          if (subtaskError) throw subtaskError;
        }

        weeklyTasks.push(insertedTask?.[0]);

        // Monthly TODO を生成（マスターリストに追加）
        const monthlyTodoTitle = `${goal.title} - ${task.category} (W${weeklyBreakdown.week})`;
        const { data: todoData, error: todoError } = await supabase
          .from("todos")
          .insert({
            title: monthlyTodoTitle,
            description: `目標: ${goal.title}\nカテゴリ: ${task.category}\nタスク: ${task.subtasks.join(", ")}\n[Goal ID: ${goal_id}]`,
            priority: 3,
            estimated_minutes: task.allocated_minutes,
            category: task.category,
            is_today: false,
            preferred_time: null,
            due_date: null, // マスターリスト用（期限は後から設定）
          })
          .select();

        if (todoError) throw todoError;
        if (todoData && todoData[0]) {
          monthlyTodos.push(todoData[0]);
        }
      }
    }

    // goal テーブルを更新
    await supabase
      .from("goals")
      .update({
        breakdown_config,
        decomposed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", goal_id);

    return NextResponse.json({
      success: true,
      weeklyTasks,
      monthlyTodos,
      summary: decomposition.summary,
    });
  } catch (err) {
    console.error("Failed to decompose OKR:", err);
    return NextResponse.json(
      { error: "Failed to decompose OKR", details: String(err) },
      { status: 500 }
    );
  }
}
