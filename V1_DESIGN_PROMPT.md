# Routine OS V1 - 設計プロンプト（要件定義書）
> このプロンプトを打てばV1と同じアプリが構築できる

## アプリ名・概要

**Routine OS（ルーティンOS）**

個人の人生目標を達成するための統合タスク・スケジュール・アドバイスシステム。
年間→月次→週次→日次の目標分解、TODO管理、時間記録、AIアドバイスを統合。

---

## 技術スタック

- **フレームワーク**: Next.js 14.2.5 (App Router)
- **言語**: TypeScript 5.0
- **UI**: Tailwind CSS 3.4.1
- **グラフ**: Recharts 2.12.0
- **DB**: Supabase（PostgreSQL）
- **AI**: Anthropic Claude API（claude-sonnet-4-5）
- **File Storage**: @vercel/blob
- **デプロイ**: Vercel

---

## データモデル（DBスキーマ）

```sql
-- todos
CREATE TABLE todos (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 3,       -- 1=高 3=中 5=低
  estimated_minutes INTEGER DEFAULT 30,
  actual_minutes INTEGER DEFAULT 0,
  category TEXT NOT NULL,           -- vfx, english, engineer, investment, fitness, personal
  is_completed BOOLEAN DEFAULT FALSE,
  is_today BOOLEAN DEFAULT FALSE,
  today_date DATE,                  -- is_today=true のときのみ設定
  preferred_time TEXT,              -- morning, afternoon, evening
  due_date DATE,
  goal_id INTEGER REFERENCES goals(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_monthly_base BOOLEAN DEFAULT FALSE,
  decomposed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- goals
CREATE TABLE goals (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,           -- fitness, investment, english, vfx, personal
  period_type TEXT NOT NULL,        -- annual, monthly, weekly
  parent_id INTEGER REFERENCES goals(id),
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_achieved BOOLEAN DEFAULT FALSE,
  breakdown_config JSONB,
  decomposed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- daily_settings
CREATE TABLE daily_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  date DATE NOT NULL,
  wake_time TIME DEFAULT '06:30',
  day_type TEXT DEFAULT 'weekday',  -- weekday, overtime, holiday
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- timer_sessions
CREATE TABLE timer_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  todo_id INTEGER REFERENCES todos(id),
  todo_title TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_seconds INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- focus_sessions
CREATE TABLE focus_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode_name TEXT NOT NULL,
  target_minutes INTEGER NOT NULL,
  actual_minutes INTEGER,
  break_minutes INTEGER,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  break_end_time TIMESTAMP WITH TIME ZONE,
  session_status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- focus_modes
CREATE TABLE focus_modes (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode_name TEXT NOT NULL UNIQUE,
  color_hex TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- shopping_lists
CREATE TABLE shopping_lists (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## APIルート設計

| メソッド | パス | 説明 |
|---|---|---|
| GET/POST | /api/settings/daily | 当日の起床時刻・曜日タイプ |
| GET/POST | /api/todos | TODO一覧取得・作成 |
| PATCH/DELETE | /api/todos/[id] | TODO更新・削除 |
| POST | /api/todos/generate | AIでTODO生成 |
| POST | /api/todos/decompose | 月別ベースTODO分解 |
| GET/POST | /api/goals | 目標一覧・作成 |
| GET/PATCH | /api/goals/[id] | 目標詳細・更新 |
| POST | /api/goals/[id]/breakdown | AI目標分解（custom_prompt対応） |
| POST | /api/advice | AIアドバイス生成 |
| POST/PATCH | /api/timer | タイマーセッション開始・終了 |
| GET | /api/timer/stats | タイマー統計 |
| GET | /api/schedule | 当日スケジュール生成 |
| POST | /api/plans | プラン保存 |
| GET/POST | /api/focus/sessions/start | 集中セッション開始 |
| PATCH | /api/focus/sessions/[id]/end | 集中セッション終了 |
| GET | /api/focus/today | 本日集中統計 |
| GET | /api/focus/stats | 集中統計 |
| GET/POST | /api/focus/modes | 集中モード |
| GET/POST | /api/shopping-lists | 買い物リスト |
| GET | /api/weather | 天気（東京） |
| POST | /api/weekly-review | 週次レビュー保存 |
| POST | /api/cron/decompose-monthly-goals | 月次目標自動分解（cron） |
| GET/POST | /api/vision/board | ビジョンボード |

---

## コンポーネント設計

### page.tsx（メインページ）
**状態**: dayType, date, wakeTime, currentTab("todo"|"other"), selectedFocusTask, activeTimer

**子コンポーネント（全リスト）**:
- DayTypeSelector - 平日/残業/休日 + 起床時刻
- TodoList - タブ式（今日のTODO/タスクリスト/目標進捗）
- GoalPanel - 目標管理OKR + AI分解
- DailyTimeline - タイムブロック可視化
- TodayMission - 今日の最重要タスク
- TodoTimer - アクティブタイマー表示
- FocusTaskSelector - シングルフォーカス選択
- FocusButton - 集中ページリンク
- AdvicePanel - AIアドバイス
- VisionBoard - ビジョン画像
- WeeklyReviewPanel - 週次レビュー（日曜は強調）
- ShoppingListPanel - 買い物リスト
- TimeStatsPanel - 時間統計
- WeatherPanel - 天気（東京）
- HowToPanel - 使い方ガイド

---

## AI統合

### 目標分解プロンプト（/api/goals/[id]/breakdown）
```
システム: あなたは目標設定とOKRの専門家です。JSON形式のみで返答してください。

ユーザー:
[ユーザープロフィール]

タイトル: ${goal.title}
カテゴリ: ${goal.category}
期間: ${start_date} 〜 ${end_date}
目標値: ${target_value} ${unit}
現在値: ${current_value} ${unit}

以下のJSON形式で分解してください:
{
  "analysis": "現状分析（200文字以内）",
  "monthly_goals": [3件 { title, target_value, unit, start_date, end_date, description }],
  "weekly_goals": [4件 { title, target_value, unit, start_date, end_date, description }],
  "todos": [5件 { title, priority(1-5), estimated_minutes, category }]
}
```

### アドバイスプロンプト（/api/advice）
```
システム: あなたは外堀の人生の最高責任者兼コンサルタントです。甘い言葉は不要。

ユーザー:
[ユーザープロフィール]
TODO完了率: X/Y件
目標進捗: [各目標のcurrent/target]

今日やるべきアクションを厳しく具体的に提案してください。
```

---

## ユーザープロフィール（profile.ts）

```typescript
export const USER_PROFILE = {
  name: "外堀",
  location: "東京都新宿区（新宿御苑前駅付近）",
  commute: "浜町駅付近へ通勤。9:20出社、19:00退社（理想）。残業時は19:00〜22:00帰宅。",
  personality: "論理的思考、アウトプット重視。効率と成果を最優先する。",
  income: "年収850万",
  investment_principal: "投資元本約800万",
  available_time: "平日夜3時間（20:00-22:00）、休日10時間",
  goals: {
    long_term:  "5年以内: 資産1億円でサイドFIRE、タワマン居住、VFX/AI事業での成功",
    mid_term:   "1〜2年: 投資額3000万円突破、英語でのコミュニケーション習得",
    short_term: "2026年4月まで: ベンチプレス100kg達成",
  },
  projects: {
    vfx:        "Blender・DaVinci Resolveを使用。AIを活用した副業やFOOHコンテンツ制作。",
    investment: "株式投資（押し目買い、新高値ブレイク戦略）。AI関連銘柄や成長株に注目。",
    fitness:    "ベンチプレス特化型メニュー。月・水・金の胸トレを軸に、姿勢矯正（背中）や肩トレをルーティン化。",
    english:    "現在TOEIC500程度。2026年GWに一人で海外旅行に行けるレベルを目指す。",
    social:     "彼女できたので恋愛は一旦完了。男女問わずいつでも仲良くなれるトーク・外見磨きのレベルアップを目指す。",
  },
};
```

---

## スケジューラーロジック（scheduler.ts）

### 固定スケジュール（平日）
```
起床(5min) → 水1杯(5min) → ダンベル(20min) → ディープワーク(可変)
08:30-09:10  通勤
09:10-12:00  仕事
12:00-12:30  筋トレ
12:30-13:00  昼食
13:00-19:00  仕事
19:00-19:30  通勤
19:30-20:00  夕食
20:00-21:50  夜のワーク（タスク配置）
21:50-22:10  入浴
22:10-22:45  ストレッチ・プロテイン・翌日確認
```

### タスク配置ルール
- ゴールデンタイム（朝）: priority=1 > vfx > english > investment
- 夜の低負荷スロット: preferred_time="evening" > 短時間タスク
- 90分ごとに10分休憩を自動挿入

---

## 状態管理

### LocalStorageキー
| キー | 値 | 用途 |
|---|---|---|
| `wakeTime-${date}` | "HH:MM" | 起床時刻 |
| `dayType-${date}` | "weekday\|overtime\|holiday" | 曜日タイプ |
| `spe-active-timer` | JSON(ActiveTimer) | アクティブタイマー |
| `spe-selected-focus-task` | JSON(Todo) | フォーカスタスク |
| `spe-todo-order` | JSON(Record<id,index>) | TODOの並び順 |
| `userId` | UUID | ユーザーID |

### CustomEvent
```typescript
// シングルフォーカス変更
window.dispatchEvent(new CustomEvent('focusTaskChanged', { detail: todo }));
```

---

## UI/UX仕様

### カラーテーマ（ダークモード固定）
- 背景: bg-gray-950 / bg-gray-900 / bg-gray-800
- テキスト: text-white / text-gray-300 / text-gray-500
- アクセント: blue-400, green-400, yellow-400, red-400, purple-400

### 優先度バッジ
- 高: bg-red-900/60 text-red-300 border-red-700
- 中: bg-yellow-900/60 text-yellow-300 border-yellow-700
- 低: bg-green-900/60 text-green-300 border-green-700

### カテゴリ絵文字
- vfx: 🎬, english: 🗣️, engineer: 📐, investment: 💰, fitness: 💪, personal: ⭐

### レイアウト
- ヘッダー: sticky, z-50
- メイン: max-w-7xl mx-auto px-4
- タブ: テキストタブ（アクティブ時 border-b-2 border-blue-400）

---

## 環境変数

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
VERCEL_BLOB_READ_WRITE_TOKEN=
```
