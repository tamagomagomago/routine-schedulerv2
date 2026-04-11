import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function test() {
  console.log("Testing Supabase connection...");
  console.log("URL:", supabaseUrl);

  // Test 1: Check if tables exist
  console.log("\n=== Test 1: Checking tables ===");
  const { data: tables, error: tableError } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public");

  if (tableError) {
    console.log("Error fetching tables:", tableError.message);
  } else {
    console.log("Available tables:", tables?.map(t => (t as any).table_name) || []);
  }

  // Test 2: Query goals_v2
  console.log("\n=== Test 2: Querying goals_v2 ===");
  const { data: goals, error: goalsError, count: goalsCount } = await supabase
    .from("goals_v2")
    .select("*", { count: "exact" })
    .eq("user_id", "default_user");

  if (goalsError) {
    console.log("Error fetching goals:", goalsError.message);
    console.log("Error code:", goalsError.code);
    console.log("Error details:", goalsError);
  } else {
    console.log(`Found ${goalsCount} goals`);
    if (goals && goals.length > 0) {
      console.log("First goal:", goals[0]);
    }
  }

  // Test 3: Query todos_v2
  console.log("\n=== Test 3: Querying todos_v2 ===");
  const { data: todos, error: todosError, count: todosCount } = await supabase
    .from("todos_v2")
    .select("*", { count: "exact" })
    .eq("user_id", "default_user");

  if (todosError) {
    console.log("Error fetching todos:", todosError.message);
    console.log("Error code:", todosError.code);
    console.log("Error details:", todosError);
  } else {
    console.log(`Found ${todosCount} todos`);
    if (todos && todos.length > 0) {
      console.log("First todo:", todos[0]);
    }
  }
}

test().catch(console.error);
