import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { StreakV2 } from "@/types/v2";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/v2/streaks - get all streaks
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("streaks")
      .select("id, category, current_streak, last_completed_date, enabled, created_at, updated_at")
      .order("category", { ascending: true });

    if (error) throw error;
    return NextResponse.json((data || []) as StreakV2[]);
  } catch (error) {
    console.error("Error fetching streaks:", error);
    return NextResponse.json({ error: "Failed to fetch streaks" }, { status: 500 });
  }
}

// PATCH /api/v2/streaks - update streak for a category
export async function PATCH(req: NextRequest) {
  try {
    const { category, current_streak, last_completed_date, enabled } = await req.json();

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const updates: any = {};
    if (current_streak !== undefined) updates.current_streak = current_streak;
    if (last_completed_date !== undefined) updates.last_completed_date = last_completed_date;
    if (enabled !== undefined) updates.enabled = enabled;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("streaks")
      .update(updates)
      .eq("category", category)
      .select("id, category, current_streak, last_completed_date, enabled, created_at, updated_at");

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Streak not found" }, { status: 404 });
    }

    return NextResponse.json(data[0] as StreakV2);
  } catch (error) {
    console.error("Error updating streak:", error);
    return NextResponse.json({ error: "Failed to update streak" }, { status: 500 });
  }
}
