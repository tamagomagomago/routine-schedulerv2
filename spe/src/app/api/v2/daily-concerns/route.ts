import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "date parameter is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("daily_concerns")
      .select("*")
      .eq("user_id", "default_user")
      .eq("concern_date", date)
      .single();

    if (error) {
      // Table might not exist yet, return null as fallback
      console.warn("Could not fetch daily concerns:", error.message);
      return NextResponse.json(null);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/v2/daily-concerns error:", error);
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, concern_date } = body;

    if (!content || !concern_date) {
      return NextResponse.json(
        { error: "Missing required fields: content, concern_date" },
        { status: 400 }
      );
    }

    // First try to update existing record
    const { data: updateData, error: updateError } = await supabase
      .from("daily_concerns")
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", "default_user")
      .eq("concern_date", concern_date)
      .select()
      .single();

    if (updateData) {
      return NextResponse.json(updateData, { status: 200 });
    }

    // If update returned no rows, insert new record
    const { data: insertData, error: insertError } = await supabase
      .from("daily_concerns")
      .insert({
        user_id: "default_user",
        concern_date,
        content,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Could not save daily concerns:", insertError.message);
      return NextResponse.json(
        { error: "Failed to save daily concerns", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(insertData, { status: 201 });
  } catch (error) {
    console.error("POST /api/v2/daily-concerns error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
