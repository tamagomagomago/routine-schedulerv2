import { createServerClient } from "@/lib/supabase";

interface GoalInput {
  title: string;
  category: string;
  period_type: "annual" | "monthly" | "weekly";
  target_value?: number;
  unit?: string;
  start_date: string;
  end_date: string;
  current_value?: number;
  parent_id?: number | null;
  description?: string;
}

async function seedAprilGoals() {
  const supabase = createServerClient();

  try {
    console.log("🌱 Seeding April 2026 goals...\n");

    // 月間目標データ
    const monthlyGoals: GoalInput[] = [
      {
        title: "投資週次レビュー4回実施",
        category: "investment",
        period_type: "monthly",
        target_value: 4,
        unit: "回",
        start_date: "2026-04-01",
        end_date: "2026-04-30",
        current_value: 0,
        description: "毎週の投資ポートフォリオを見直し",
      },
      {
        title: "英語シャドーイング週3回定着",
        category: "english",
        period_type: "monthly",
        target_value: 12,
        unit: "回",
        start_date: "2026-04-01",
        end_date: "2026-04-30",
        current_value: 0,
        description: "毎週3回、計12回のシャドーイング",
      },
      {
        title: "Instagram月10本投稿",
        category: "vfx",
        period_type: "monthly",
        target_value: 10,
        unit: "本",
        start_date: "2026-04-01",
        end_date: "2026-04-30",
        current_value: 0,
        description: "映像制作の投稿を月10本",
      },
      {
        title: "ベンチプレス90kg達成",
        category: "fitness",
        period_type: "monthly",
        target_value: 90,
        unit: "kg",
        start_date: "2026-04-01",
        end_date: "2026-04-30",
        current_value: 0,
        description: "月末までにベンチプレス90kg達成",
      },
      {
        title: "技術士学習36h",
        category: "engineer",
        period_type: "monthly",
        target_value: 36,
        unit: "h",
        start_date: "2026-04-01",
        end_date: "2026-04-30",
        current_value: 0,
        description: "技術士試験対策の学習時間",
      },
    ];

    // 月間目標を登録
    console.log("📌 Registering monthly goals...");
    const monthlyGoalIds: Record<string, number> = {};

    for (const goal of monthlyGoals) {
      const { data, error } = await supabase
        .from("goals_v2")
        .insert([
          {
            title: goal.title,
            category: goal.category,
            period_type: goal.period_type,
            target_value: goal.target_value,
            unit: goal.unit,
            start_date: goal.start_date,
            end_date: goal.end_date,
            current_value: goal.current_value || 0,
            parent_id: null,
          },
        ])
        .select();

      if (error) {
        console.error(`❌ Error registering goal "${goal.title}":`, error.message);
        continue;
      }

      if (data && data[0]) {
        monthlyGoalIds[goal.title] = data[0].id;
        console.log(`  ✅ "${goal.title}" (ID: ${data[0].id})`);
      }
    }

    // 週次目標データ
    const weeklyGoals: Array<GoalInput & { monthlyTitle: string }> = [
      // 第3週
      {
        title: "シャドーイング3回",
        category: "english",
        period_type: "weekly",
        target_value: 3,
        unit: "回",
        start_date: "2026-04-11",
        end_date: "2026-04-17",
        current_value: 0,
        monthlyTitle: "英語シャドーイング週3回定着",
        description: "第3週のシャドーイング目標",
      },
      {
        title: "Instagram投稿2〜3本（第3週）",
        category: "vfx",
        period_type: "weekly",
        target_value: 2,
        unit: "本",
        start_date: "2026-04-11",
        end_date: "2026-04-17",
        current_value: 0,
        monthlyTitle: "Instagram月10本投稿",
        description: "第3週の映像投稿",
      },
      {
        title: "胸トレ3回・87.5kgトライ",
        category: "fitness",
        period_type: "weekly",
        target_value: 3,
        unit: "回",
        start_date: "2026-04-11",
        end_date: "2026-04-17",
        current_value: 0,
        monthlyTitle: "ベンチプレス90kg達成",
        description: "第3週のベンチプレス",
      },
      {
        title: "技術士9h・過去問2〜3年分（第3週）",
        category: "engineer",
        period_type: "weekly",
        target_value: 9,
        unit: "h",
        start_date: "2026-04-11",
        end_date: "2026-04-17",
        current_value: 0,
        monthlyTitle: "技術士学習36h",
        description: "第3週の技術士学習",
      },
      // 第4週
      {
        title: "シャドーイング3回・単語50個（第4週）",
        category: "english",
        period_type: "weekly",
        target_value: 3,
        unit: "回",
        start_date: "2026-04-18",
        end_date: "2026-04-24",
        current_value: 0,
        monthlyTitle: "英語シャドーイング週3回定着",
        description: "第4週のシャドーイング目標",
      },
      {
        title: "Instagram投稿2〜3本（第4週）",
        category: "vfx",
        period_type: "weekly",
        target_value: 2,
        unit: "本",
        start_date: "2026-04-18",
        end_date: "2026-04-24",
        current_value: 0,
        monthlyTitle: "Instagram月10本投稿",
        description: "第4週の映像投稿",
      },
      {
        title: "胸トレ3回・90kgトライアル（第4週）",
        category: "fitness",
        period_type: "weekly",
        target_value: 3,
        unit: "回",
        start_date: "2026-04-18",
        end_date: "2026-04-24",
        current_value: 0,
        monthlyTitle: "ベンチプレス90kg達成",
        description: "第4週のベンチプレス",
      },
      {
        title: "技術士9h・過去問2〜3年分（第4週）",
        category: "engineer",
        period_type: "weekly",
        target_value: 9,
        unit: "h",
        start_date: "2026-04-18",
        end_date: "2026-04-24",
        current_value: 0,
        monthlyTitle: "技術士学習36h",
        description: "第4週の技術士学習",
      },
      // 第5週
      {
        title: "シャドーイング3回・4月習慣確認（第5週）",
        category: "english",
        period_type: "weekly",
        target_value: 3,
        unit: "回",
        start_date: "2026-04-25",
        end_date: "2026-04-30",
        current_value: 0,
        monthlyTitle: "英語シャドーイング週3回定着",
        description: "第5週のシャドーイング目標",
      },
      {
        title: "Instagram投稿2本・月10本達成確認（第5週）",
        category: "vfx",
        period_type: "weekly",
        target_value: 2,
        unit: "本",
        start_date: "2026-04-25",
        end_date: "2026-04-30",
        current_value: 0,
        monthlyTitle: "Instagram月10本投稿",
        description: "第5週の映像投稿",
      },
      {
        title: "胸トレ3回・90kg達成確定（第5週）",
        category: "fitness",
        period_type: "weekly",
        target_value: 3,
        unit: "回",
        start_date: "2026-04-25",
        end_date: "2026-04-30",
        current_value: 0,
        monthlyTitle: "ベンチプレス90kg達成",
        description: "第5週のベンチプレス",
      },
      {
        title: "技術士6h・10年分読了・傾向まとめ（第5週）",
        category: "engineer",
        period_type: "weekly",
        target_value: 6,
        unit: "h",
        start_date: "2026-04-25",
        end_date: "2026-04-30",
        current_value: 0,
        monthlyTitle: "技術士学習36h",
        description: "第5週の技術士学習",
      },
    ];

    // 週次目標を登録
    console.log("\n📅 Registering weekly goals...");
    let weeklyCount = 0;

    for (const goal of weeklyGoals) {
      const parentId = monthlyGoalIds[goal.monthlyTitle];

      const { data, error } = await supabase
        .from("goals_v2")
        .insert([
          {
            title: goal.title,
            category: goal.category,
            period_type: goal.period_type,
            target_value: goal.target_value,
            unit: goal.unit,
            start_date: goal.start_date,
            end_date: goal.end_date,
            current_value: goal.current_value || 0,
            parent_id: parentId || null,
          },
        ])
        .select();

      if (error) {
        console.error(`❌ Error registering weekly goal "${goal.title}":`, error.message);
        continue;
      }

      if (data && data[0]) {
        weeklyCount++;
        console.log(`  ✅ "${goal.title}" (Parent: ${goal.monthlyTitle})`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 Seeding Summary:");
    console.log(`  ✅ Monthly goals: ${Object.keys(monthlyGoalIds).length}`);
    console.log(`  ✅ Weekly goals: ${weeklyCount}`);
    console.log(`  ✅ Total: ${Object.keys(monthlyGoalIds).length + weeklyCount}`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

seedAprilGoals();
