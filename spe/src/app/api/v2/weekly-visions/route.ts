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

    // If table doesn't exist or has other issues, return null (client will handle it)
    if (error) {
      console.warn("Vision query error (table may not exist):", error.message);
      return NextResponse.json(null);
    }

    return NextResponse.json(data || null);
  } catch (error) {
    console.error("Error fetching weekly vision:", error);
    // Return null instead of error so client can fall back to localStorage
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { monday_vision, sunday_vision, is_confirmed } = body;

    const weekStart = getWeekMonday();

    // First try to update existing record
    const { data: updateData, error: updateError } = await supabase
      .from("weekly_visions")
      .update({
        monday_vision,
        sunday_vision,
        is_confirmed: is_confirmed || false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", "default_user")
      .eq("week_start", weekStart)
      .select()
      .single();

    if (updateData) {
      return NextResponse.json(updateData, { status: 200 });
    }

    // If update returned no rows, insert new record
    const { data: insertData, error: insertError } = await supabase
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

    if (insertError) {
      console.error("Could not save to Supabase:", insertError.message);
      return NextResponse.json(
        { error: "Failed to save weekly vision", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(insertData, { status: 201 });
  } catch (error) {
    console.error("Error creating weekly vision:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
      console.error("Could not update in Supabase:", error.message);
      return NextResponse.json(
        { error: "Failed to update weekly vision", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating weekly vision:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
