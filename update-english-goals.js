const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateEnglishGoals() {
  try {
    console.log("英語の目標を更新しています...\n");

    // 1. 月間目標を更新
    const { data: monthlyGoals, error: monthlyError } = await supabase
      .from("goals_v2")
      .select("id, title, period_type, start_date")
      .eq("user_id", "default_user")
      .eq("period_type", "monthly")
      .like("title", "%英語%");

    if (monthlyError) throw monthlyError;

    if (monthlyGoals && monthlyGoals.length > 0) {
      for (const goal of monthlyGoals) {
        const { error: updateError } = await supabase
          .from("goals_v2")
          .update({
            title: "🗣️ 英語Speakアプリ10h",
            target_value: 10,
            updated_at: new Date().toISOString(),
          })
          .eq("id", goal.id);

        if (updateError) throw updateError;
        console.log(`✅ 月間目標を更新: ${goal.title} → 🗣️ 英語Speakアプリ10h (10h)`);
      }
    } else {
      console.log("❌ 月間の英語目標が見つかりません");
    }

    // 2. 週間目標を更新（第3〜5週）
    const { data: weeklyGoals, error: weeklyError } = await supabase
      .from("goals_v2")
      .select("id, title, period_type, start_date")
      .eq("user_id", "default_user")
      .eq("period_type", "weekly")
      .like("title", "%英語%");

    if (weeklyError) throw weeklyError;

    if (weeklyGoals && weeklyGoals.length > 0) {
      for (const goal of weeklyGoals) {
        const { error: updateError } = await supabase
          .from("goals_v2")
          .update({
            title: "🗣️ 英語Speakアプリ2.5h",
            target_value: 2.5,
            updated_at: new Date().toISOString(),
          })
          .eq("id", goal.id);

        if (updateError) throw updateError;
        console.log(`✅ 週間目標を更新: ${goal.title} → 🗣️ 英語Speakアプリ2.5h (2.5h)`);
      }
    } else {
      console.log("❌ 週間の英語目標が見つかりません");
    }

    console.log("\n✅ 英語の目標の更新が完了しました！");
  } catch (error) {
    console.error("エラーが発生しました:", error.message);
    process.exit(1);
  }
}

updateEnglishGoals();
