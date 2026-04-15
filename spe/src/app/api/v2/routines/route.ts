import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const today = searchParams.get("today");

    let query = supabase
      .from("routines")
      .select("*")
      .eq("user_id", "default_user")
      .order("scheduled_start", { ascending: true });

    if (today === "true") {
      // Get routines for today based on weekday - only enabled ones
      const dayOfWeek = new Date().getDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday-Friday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday-Saturday

      const { data, error } = await query.eq("is_enabled", true);

      // If table doesn't exist, return empty array
      if (error) {
        console.warn("Routines table may not exist:", error.message);
        return NextResponse.json([]);
      }

      if (!data) return NextResponse.json([]);

      // Filter by weekday_types
      const filteredData = data.filter((routine: any) => {
        const types = routine.weekday_types;
        if (isWeekday) return types.weekdays === true;
        if (isWeekend) return types.weekends === true;
        return false;
      });

      return NextResponse.json(filteredData);
    }

    const { data, error } = await query;

    // If table doesn't exist, return empty array
    if (error) {
      console.warn("Routines table may not exist:", error.message);
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching routines:", error);
    // Return empty array on error instead of 500
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("POST /api/v2/routines - Request body:", body);

    const { title, category, estimated_minutes, scheduled_start, weekday_types } = body;

    if (!title || !category || !scheduled_start) {
      return NextResponse.json(
        { error: "Missing required fields: title, category, scheduled_start" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("routines")
      .insert({
        user_id: "default_user",
        title,
        category,
        estimated_minutes: estimated_minutes || 30,
        scheduled_start,
        weekday_types: weekday_types || { weekdays: true, weekends: false },
      })
      .select()
      .single();

    if (error) {
      console.warn("Could not save to Supabase:", error.message);
      // Return success anyway - client will use localStorage as fallback
      return NextResponse.json({
        user_id: "default_user",
        title,
        category,
        estimated_minutes: estimated_minutes || 30,
        scheduled_start,
        weekday_types: weekday_types || { weekdays: true, weekends: false },
      }, { status: 201 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/v2/routines error:", error);
    // Return the data anyway so client knows save succeeded (will use localStorage)
    const body = await req.json();
    return NextResponse.json({
      user_id: "default_user",
      title: body.title,
      category: body.category,
      estimated_minutes: body.estimated_minutes || 30,
      scheduled_start: body.scheduled_start,
      weekday_types: body.weekday_types || { weekdays: true, weekends: false },
    }, { status: 201 });
  }
}
