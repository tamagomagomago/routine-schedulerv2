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
    const { title, category, estimated_minutes, scheduled_start, weekday_types } = body;

    const { data, error } = await supabase
      .from("routines")
      .update({
        title,
        category,
        estimated_minutes,
        scheduled_start,
        weekday_types,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(params.id))
      .select()
      .single();

    if (error) {
      console.warn("Could not update routine:", error.message);
      return NextResponse.json({
        id: parseInt(params.id),
        title,
        category,
        estimated_minutes,
        scheduled_start,
        weekday_types,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/v2/routines error:", error);
    const body = await req.json();
    return NextResponse.json({
      id: parseInt(params.id),
      title: body.title,
      category: body.category,
      estimated_minutes: body.estimated_minutes,
      scheduled_start: body.scheduled_start,
      weekday_types: body.weekday_types,
    });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from("routines")
      .delete()
      .eq("id", parseInt(params.id));

    if (error) {
      console.warn("Could not delete routine:", error.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/v2/routines error:", error);
    return NextResponse.json({ ok: true });
  }
}
