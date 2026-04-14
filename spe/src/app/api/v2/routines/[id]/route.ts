import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { id } = params;

    const { title, category, estimated_minutes, scheduled_start, weekday_types } = body;

    const { data, error } = await supabase
      .from("routines")
      .update({
        ...(title && { title }),
        ...(category && { category }),
        ...(estimated_minutes && { estimated_minutes }),
        ...(scheduled_start && { scheduled_start }),
        ...(weekday_types && { weekday_types }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", "default_user")
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/v2/routines/[id] error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error } = await supabase
      .from("routines")
      .delete()
      .eq("id", id)
      .eq("user_id", "default_user");

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/v2/routines/[id] error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
