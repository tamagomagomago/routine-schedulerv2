import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { StreakV2 } from "@/types/v2";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TODAY = new Date().toISOString().split("T")[0];

// POST /api/v2/streaks/update - Calculate and update streaks based on today's completions
export async function POST(req: NextRequest) {
  try {
    const { category } = await req.json();

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    // Get today's completed tasks for this category
    const { data: todayTasks, error: tasksError } = await supabase
      .from("todos_v2")
      .select("id, is_completed")
      .eq("category", category)
      .eq("scheduled_date", TODAY);

    if (tasksError) throw tasksError;

    const completedCount = (todayTasks || []).filter(t => t.is_completed).length;
    const hasCompletedAny = completedCount > 0;

    // Get current streak
    const { data: streakData, error: streakError } = await supabase
      .from("streaks")
      .select("current_streak, last_completed_date")
      .eq("category", category)
      .single();

    if (streakError || !streakData) {
      return NextResponse.json({ error: "Streak not found" }, { status: 404 });
    }

    let newStreakCount = streakData.current_streak || 0;

    if (hasCompletedAny) {
      // At least one task completed today
      const lastCompletedDate = streakData.last_completed_date;

      if (!lastCompletedDate) {
        // First time streak
        newStreakCount = 1;
      } else if (lastCompletedDate === TODAY) {
        // Already counted today
        newStreakCount = streakData.current_streak;
      } else {
        // Check if it's a consecutive day
        const lastDate = new Date(lastCompletedDate);
        const todayDate = new Date(TODAY);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          newStreakCount = (streakData.current_streak || 0) + 1;
        } else {
          // Gap in streak - reset
          newStreakCount = 1;
        }
      }
    } else {
      // No tasks completed today - keep existing but could reset if gap is too long
      if (streakData.last_completed_date) {
        const lastDate = new Date(streakData.last_completed_date);
        const todayDate = new Date(TODAY);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          // Gap of more than 1 day - reset streak
          newStreakCount = 0;
        }
      }
    }

    // Update streak
    const { data: updatedData, error: updateError } = await supabase
      .from("streaks")
      .update({
        current_streak: newStreakCount,
        last_completed_date: hasCompletedAny ? TODAY : streakData.last_completed_date,
        updated_at: new Date().toISOString(),
      })
      .eq("category", category)
      .select("id, category, current_streak, last_completed_date, enabled, created_at, updated_at");

    if (updateError) throw updateError;
    if (!updatedData || updatedData.length === 0) {
      return NextResponse.json({ error: "Failed to update streak" }, { status: 500 });
    }

    return NextResponse.json(updatedData[0] as StreakV2);
  } catch (error) {
    console.error("Error updating streak:", error);
    return NextResponse.json({ error: "Failed to update streak" }, { status: 500 });
  }
}
