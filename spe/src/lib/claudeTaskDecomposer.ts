import Anthropic from "@anthropic-ai/sdk";

export interface BreakdownConfig {
  [key: string]: number; // category: hours per item
}

export interface WeeklyTaskBreakdown {
  week: number; // 1-4
  tasks: {
    category: string;
    allocated_minutes: number;
    subtasks: string[];
  }[];
}

export interface DecompositionResult {
  weeklyBreakdowns: WeeklyTaskBreakdown[];
  summary: string;
}

export async function decomposeOKRWithClaude(
  goal: {
    title: string;
    targetValue: number;
    unit: string;
  },
  breakdownConfig: BreakdownConfig
): Promise<DecompositionResult> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const configSummary = Object.entries(breakdownConfig)
    .map(([category, hours]) => `${category}: ${hours}時間/${goal.unit}`)
    .join("\n");

  const prompt = `
あなたは効果的なタスク分解の専門家です。
以下の月間目標（OKR）を4週間に分解してください。

【月間目標】
タイトル: ${goal.title}
目標数: ${goal.targetValue}${goal.unit}
月間総時間: ${Object.values(breakdownConfig).reduce((a, b) => a + b) * goal.targetValue}時間

【各作業の時間配分】（1${goal.unit}あたり）
${configSummary}

【重要な要件：段階的な難度設定】
ユーザーが継続してタスクをこなすために、以下の難度配分で分解してください：
- **週1**：基礎・準備作業を中心。簡単で達成感を得られるタスク（全体の20%程度）
- **週2-3**：本格的な作業。難度は中程度（全体の60%程度、両週合わせて）
- **週4**：難度の高いタスク・締切間近。高い集中力が必要（全体の20%程度）

【その他の要件】
1. 各週で全カテゴリの作業を含めてください
2. 各カテゴリごとに2-3個の具体的なサブタスクを提示してください
3. 返答は以下のJSON形式のみ（前後のテキストなし）で返してください

{
  "weeklyBreakdowns": [
    {
      "week": 1,
      "tasks": [
        {
          "category": "基礎学習",
          "allocated_minutes": 120,
          "subtasks": ["教材準備", "基本概念確認"]
        }
      ]
    }
  ],
  "summary": "段階的な難度配分により、継続的なタスク実行を支援する4週間の計画です..."
}

※ allocated_minutes は分単位で指定してください
※ 週1は最も簡単、週4に向けて段階的に難しくしてください
`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // JSON をパース
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Claude response as JSON");
  }

  const result: DecompositionResult = JSON.parse(jsonMatch[0]);
  return result;
}
