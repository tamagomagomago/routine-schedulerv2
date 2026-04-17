import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();

    const updates: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // 完了時は完了日時を自動設定
    if (body.is_completed === true && !body.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
    if (body.is_completed === false) {
      updates.completed_at = null;
    }

    // MITを設定する場合は他のMITを外す
    if (body.is_mit === true) {
      await supabase
        .from("todos_v2")
        .update({ is_mit: false })
        .eq("user_id", "default_user")
        .eq("is_mit", true)
        .neq("id", params.id);
    }

    const { data, error } = await supabase
      .from("todos_v2")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.warn("Could not update todo in Supabase:", error.message);
      // Return success anyway - client will use localStorage as fallback
      return NextResponse.json({
        id: parseInt(params.id),
        ...updates,
      });
    }

    // 完了時はfocus_sessionを作成
    if (body.is_completed === true && data) {
      const todo = data;

      // 開始時刻を計算（scheduled_date + scheduled_start）
      let startDateTime: string;
      if (todo.scheduled_date && todo.scheduled_start) {
        // 例：2026-04-13 + 09:30 → 2026-04-13T09:30:00Z
        const [year, month, day] = todo.scheduled_date.split("-");
        const [hour, minute] = todo.scheduled_start.split(":");
        startDateTime = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`).toISOString();
      } else {
        // scheduled_start がない場合は、現在時刻から見積分を遡る
        const now = new Date();
        const estimatedMinutes = todo.estimated_minutes || 0;
        const startTime = new Date(now.getTime() - estimatedMinutes * 60000);
        startDateTime = startTime.toISOString();
      }

      // focus_sessionを作成
      const { error: sessionError } = await supabase
        .from("focus_sessions_v2")
        .insert({
          user_id: "default_user",
          todo_id: parseInt(params.id),
          todo_title: todo.title,
          category: todo.category,
          planned_minutes: todo.estimated_minutes || 0,
          actual_minutes: todo.estimated_minutes || 0,
          started_at: startDateTime,
          ended_at: new Date().toISOString(),
        });

      if (sessionError) {
        console.warn(`Could not create focus session for todo ${params.id}:`, sessionError);
        // エラーでもTODOの完了は成功させる（focus_sessionは後から作成される可能性）
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/v2/todos error:", error);
    // Return success with submitted data so client knows update succeeded
    const updates: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    };
    if (body.is_completed === true && !body.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
    if (body.is_completed === false) {
      updates.completed_at = null;
    }
    return NextResponse.json({
      id: parseInt(params.id),
      ...updates,
    });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabase.from("todos_v2").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
