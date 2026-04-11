import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface GoalData {
  title: string;
  category: string;
  target_value: number;
  unit: string;
  current_value: number;
  start_date: string;
  end_date: string;
  goal_type: string;
  memo: string;
}

const annualGoals: GoalData[] = [
  {
    title: "サイドファイアに向けた投資増強",
    category: "investment",
    target_value: 1500,
    unit: "万円",
    current_value: 1000,
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    goal_type: "maintain",
    memo: "週1回20分レビューのみ。追加入金＋運用益で毎月積み上げ",
  },
  {
    title: "IELTS Speaking 5.5達成",
    category: "english",
    target_value: 800,
    unit: "TOEIC換算点",
    current_value: 650,
    start_date: "2026-01-01",
    end_date: "2026-10-31",
    goal_type: "maintain",
    memo: "TOEIC800点＝IELTS5.5相当。夜の英語アプリ1hで維持",
  },
  {
    title: "Instagram フォロワー10,000人",
    category: "vfx",
    target_value: 10000,
    unit: "フォロワー",
    current_value: 12,
    start_date: "2026-01-01",
    end_date: "2026-10-31",
    goal_type: "main",
    memo: "月10本投稿習慣を確立。前半は数字より投稿継続が優先",
  },
  {
    title: "ベンチプレス100kg達成",
    category: "fitness",
    target_value: 100,
    unit: "kg",
    current_value: 85,
    start_date: "2026-01-01",
    end_date: "2026-04-30",
    goal_type: "maintain",
    memo: "4月末90kg達成後は維持目標に移行。月水金の胸トレで継続",
  },
  {
    title: "技術士二次試験合格",
    category: "engineer",
    target_value: 135,
    unit: "h",
    current_value: 0,
    start_date: "2026-01-01",
    end_date: "2026-07-20",
    goal_type: "main",
    memo: "朝1.5h×週6日＝月36h。4月過去問・5月論文型・6月仕上げ・7月模擬",
  },
];

async function main() {
  console.log("🚀 年間目標を更新します...\n");

  let successCount = 0;
  let updateCount = 0;
  let insertCount = 0;

  for (const goal of annualGoals) {
    try {
      // 既存レコードを検索
      const { data: existing } = await supabase
        .from("goals_v2")
        .select("id")
        .eq("user_id", "default_user")
        .eq("period_type", "annual")
        .eq("title", goal.title)
        .single();

      if (existing) {
        // UPDATE
        const { error } = await supabase
          .from("goals_v2")
          .update({
            category: goal.category,
            target_value: goal.target_value,
            unit: goal.unit,
            current_value: goal.current_value,
            start_date: goal.start_date,
            end_date: goal.end_date,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) {
          console.error(`❌ UPDATE 失敗: ${goal.title}`, error.message);
        } else {
          console.log(`✅ UPDATE: ${goal.title}`);
          updateCount++;
          successCount++;
        }
      } else {
        // INSERT
        const { error } = await supabase.from("goals_v2").insert([
          {
            user_id: "default_user",
            title: goal.title,
            category: goal.category,
            period_type: "annual",
            target_value: goal.target_value,
            unit: goal.unit,
            current_value: goal.current_value,
            start_date: goal.start_date,
            end_date: goal.end_date,
            is_achieved: false,
            parent_id: null,
          },
        ]);

        if (error) {
          console.error(`❌ INSERT 失敗: ${goal.title}`, error.message);
        } else {
          console.log(`✅ INSERT: ${goal.title}`);
          insertCount++;
          successCount++;
        }
      }
    } catch (err) {
      console.error(`❌ エラー: ${goal.title}`, err);
    }
  }

  console.log(`\n📊 結果:`);
  console.log(`  成功: ${successCount}/${annualGoals.length}`);
  console.log(`  UPDATE: ${updateCount}`);
  console.log(`  INSERT: ${insertCount}`);
}

main().catch((err) => {
  console.error("❌ スクリプト実行エラー:", err);
  process.exit(1);
});
