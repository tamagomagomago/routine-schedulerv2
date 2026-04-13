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
  const body = await req.json();
  const { data, error } = await supabase
    .from("todos_v2")
    .insert({ ...body, user_id: "default_user" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
