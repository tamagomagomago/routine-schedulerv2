import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("shopping_lists")
      .select("*")
      .eq("is_completed", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (err) {
    console.error("Failed to fetch shopping lists:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, category, tags } = await req.json();

    if (!title || !category) {
      return NextResponse.json(
        { error: "Title and category are required" },
        { status: 400 }
      );
    }

    const itemTags = tags || ['百均'];

    const { data, error } = await supabase
      .from("shopping_lists")
      .insert({
        title,
        category,
        tags: itemTags,
        is_completed: false,
        user_id: "default_user",
      })
      .select();

    if (error) throw error;
    return NextResponse.json({ item: data?.[0] }, { status: 201 });
  } catch (err) {
    console.error("Failed to create shopping list item:", err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
