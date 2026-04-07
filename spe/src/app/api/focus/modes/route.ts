import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: modes, error } = await supabase
      .from("focus_modes")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return predefined modes if none exist
    const defaultModes = [
      { id: 1, mode_name: "生成AI", color_hex: "#3b82f6" },
      { id: 2, mode_name: "映像制作", color_hex: "#8b5cf6" },
      { id: 3, mode_name: "技術士勉強", color_hex: "#10b981" },
    ];

    const finalModes = (modes && modes.length > 0) ? modes : defaultModes;

    return NextResponse.json({
      modes: finalModes,
    });
  } catch (e) {
    console.error("Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, mode_name, color_hex } = body;

    if (!user_id || !mode_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("focus_modes")
      .insert({
        user_id,
        mode_name,
        color_hex: color_hex || "#8b5cf6",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
