import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const includeGoalTodos = searchParams.get("includeGoalTodos") === "true";

  let query = supabase
    .from("todos_v2")
    .select("*")
    .eq("user_id", "default_user");

  // デフォルトでは goal_id: null のTODOのみ返す（TODOリスト用）
  // includeGoalTodos=true の場合はすべてのTODOを返す
  if (!includeGoalTodos) {
    query = query.is("goal_id", null);
  }

  if (date) {
    query = query.eq("scheduled_date", date);
  }

  const { data, error } = await query.order("is_mit", { ascending: false })
    .order("scheduled_start", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("POST /api/v2/todos - Request body:", body);

    // todos_v2 テーブルに存在するカラムのみを抽出
    const allowedFields = [
      "title", "category", "priority", "estimated_minutes",
      "scheduled_date", "scheduled_start", "is_mit", "goal_id"
    ];
    const filteredBody = Object.keys(body)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    console.log("POST /api/v2/todos - Filtered body:", filteredBody);

    const { data, error } = await supabase
      .from("todos_v2")
      .insert({ ...filteredBody, user_id: "default_user" })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST /api/v2/todos error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
