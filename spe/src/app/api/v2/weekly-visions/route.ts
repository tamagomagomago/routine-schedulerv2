import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getWeekMonday(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  try {
    const weekStart = getWeekMonday();

    const { data, error } = await supabase
      .from("weekly_visions")
      .select("*")
      .eq("user_id", "default_user")
      .eq("week_start", weekStart)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json(data || null);
  } catch (error) {
    console.error("Error fetching weekly vision:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly vision", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { monday_vision, sunday_vision, is_confirmed } = body;

    const weekStart = getWeekMonday();

    const { data, error } = await supabase
      .from("weekly_visions")
      .insert({
        user_id: "default_user",
        week_start: weekStart,
        monday_vision,
        sunday_vision,
        is_confirmed: is_confirmed || false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating weekly vision:", error);
    return NextResponse.json(
      { error: "Failed to create weekly vision", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { monday_vision, sunday_vision, is_confirmed } = body;

    const weekStart = getWeekMonday();

    const { data, error } = await supabase
      .from("weekly_visions")
      .update({
        monday_vision,
        sunday_vision,
        is_confirmed,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", "default_user")
      .eq("week_start", weekStart)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating weekly vision:", error);
    return NextResponse.json(
      { error: "Failed to update weekly vision", details: String(error) },
      { status: 500 }
    );
  }
}
