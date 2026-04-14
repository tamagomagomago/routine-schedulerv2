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
    const id = params.id;
    const body = await req.json();
    console.log(`PATCH /api/v2/routines/${id} - Request body:`, body);

    const { title, category, estimated_minutes, scheduled_start, weekday_types } = body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (category !== undefined) updateData.category = category;
    if (estimated_minutes !== undefined) updateData.estimated_minutes = estimated_minutes;
    if (scheduled_start !== undefined) updateData.scheduled_start = scheduled_start;
    if (weekday_types !== undefined) updateData.weekday_types = weekday_types;

    const { data, error } = await supabase
      .from("routines")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", "default_user")
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Routine not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(`PATCH /api/v2/routines/[id] error:`, error);
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
    const id = params.id;
    console.log(`DELETE /api/v2/routines/${id}`);

    const { error } = await supabase
      .from("routines")
      .delete()
      .eq("id", id)
      .eq("user_id", "default_user");

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/v2/routines/[id] error:`, error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
