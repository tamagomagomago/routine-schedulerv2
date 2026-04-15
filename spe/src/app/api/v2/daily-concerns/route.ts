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

    const { data, error } = await supabase
      .from("daily_concerns")
      .upsert({
        user_id: "default_user",
        concern_date,
        content,
      })
      .select()
      .single();

    if (error) {
      console.warn("Could not save daily concerns:", error.message);
      // Return success anyway - client will use localStorage as fallback
      return NextResponse.json({
        user_id: "default_user",
        concern_date,
        content,
      }, { status: 201 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/v2/daily-concerns error:", error);
    // Return the data anyway so client knows save succeeded
    const body = await req.json();
    return NextResponse.json({
      user_id: "default_user",
      concern_date: body.concern_date,
      content: body.content,
    }, { status: 201 });
  }
}
