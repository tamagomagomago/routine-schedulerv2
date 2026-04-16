"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TodoV2, FocusSessionV2, CATEGORY_EMOJI, CATEGORY_COLOR, CATEGORY_LABEL } from "@/types/v2";

const TODAY = new Date().toISOString().split("T")[0];
const PRESET_MINUTES = [15, 25, 50, 90];

// モチベーション＆集中力ブーストメッセージ 50個
const MOTIVATION_MESSAGES = [
  // 偉人の名言系（13個）
  "完璧を目指すな。完了を目指せ。",
  "最初の一歩を踏み出さない限り、道は開かれない。",
  "今この瞬間が、人生でもっとも大事な瞬間だ。",
  "やると決めたら、言い訳を消す。",
  "集中力とは、邪魔を排除する力である。",
  "1%の改善を毎日積む。それが年で37倍になる。",
  "苦しいから逃げるのではなく、逃げるから苦しいのだ。",
  "成功は準備と機会の交点である。",
  "今日の自分は、昨日の決断の結果だ。",
  "行動が思考を生む。思考が行動を生むのではない。",
  "人生は短い。迷ってる時間は最高の無駄だ。",
  "質問を変えろ。『できるか』ではなく『どうやるか』と問え。",
  "未来は、今この瞬間の選択で決まる。",

  // 脳科学・集中力メカニズム系（13個）
  "深い集中は、最初の5分が勝負。まずは始める。",
  "ドーパミンは報酬で出るのではなく、目標への進捗で出る。",
  "25分集中＋5分休憩。脳は短周期に最適化している。",
  "背中を伸ばすだけで脳の覚醒度が15%上がる。",
  "複数タスク切り替えは集中力を40%低下させる。1つに絞れ。",
  "目標を声に出すと、脳が優先順位を自動調整する。",
  "短期記憶は3～4個が限界。今のタスクだけに脳を使え。",
  "疲労は集中力の敵ではなく、集中の信号だ。その先にフロー状態がある。",
  "朝日を浴びると、セロトニン分泌が活発になり集中力が1.5倍になる。",
  "手を動かすことで脳が覚醒する。まずペンを握れ。",
  "瞬きの回数を減らすと、視覚野への集中が深まる。",
  "深呼吸1回で副交感神経が優位になり、集中モードに入る。",
  "脳は『難しい』と認識すると、集中ホルモンを放出する。",

  // 実行系・自分事化メッセージ（16個）
  "今日のこの30分が、来月の自分を変える。",
  "迷ってる時間ももったいない。とにかくやる。",
  "終わった後の達成感のために、今この瞬間に全力を使え。",
  "プロは気分に左右されない。決めたことを実行する人だ。",
  "今逃げたら、後で2倍疲れる。今やり切れ。",
  "スマホは敵。機内モードにしたか確認しろ。",
  "集中できないのは、目標が曖昧だからだ。『何を』『いつまでに』を言え。",
  "このタスクが終わったら、自分はどうなってるか想像しろ。",
  "投資のリターンは『時間 × 集中度』。今が最高の時給だ。",
  "後でいいや、は永遠に来ない。今やるのが最速だ。",
  "技術士試験まであと○日。この時間を無駄にするな。",
  "やり切った自分が、翌日の自分を褒める。その連鎖が人生だ。",
  "集中してる今、お前はライバルより1日先にいる。",
  "『疲れた』は心の声じゃなく、脳の言い訳だ。無視しろ。",
  "人生で最も価値のある資産は『時間』だ。今を大切にしろ。",
  "完璧な環境を待つな。今ここで最高を出せ。",

  // 短期トリガー系（8個）
  "あと10分。その10分が月を変える。",
  "今この瞬間、お前は『できる人』だ。",
  "スマホを置け。それだけで集中力は3倍になる。",
  "息を止めるな。深呼吸。リセット。",
  "音声通知は切ったか？確認しろ。",
  "ここから先は、別世界だ。没入しろ。",
  "集中力は筋肉だ。今この瞬間で鍛えてる。",
  "やらない後悔より、やった疲労。迷うな。",
];

interface FocusTabProps {
  initialTodo?: TodoV2 | null;
}

export default function FocusTab({ initialTodo }: FocusTabProps) {
  const [todos, setTodos] = useState<TodoV2[]>([]);
  const [sessions, setSessions] = useState<FocusSessionV2[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<TodoV2 | null>(initialTodo ?? null);
  const [customTitle, setCustomTitle] = useState("");
  const [customCategory, setCustomCategory] = useState("personal");
  const [plannedMinutes, setPlannedMinutes] = useState(25);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [shownMessagesToday, setShownMessagesToday] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("v2_shown_messages_today");
      return new Set(stored ? JSON.parse(stored) : []);
    }
    return new Set();
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
    const [todosRes, sessionsRes] = await Promise.all([
      // 集中タブは「今日のTODO」のみを表示する
      fetch(`/api/v2/todos?date=${TODAY}&includeGoalTodos=true`),
      fetch(`/api/v2/focus?date=${TODAY}`),
    ]);
    if (todosRes.ok) {
      const allTodos = await todosRes.json();
      // scheduled_dateが今日のものだけをフィルタリング
      const todayTodos = Array.isArray(allTodos)
        ? allTodos.filter((t: TodoV2) => t.scheduled_date === TODAY && !t.is_completed)
        : [];
      setTodos(todayTodos);
    }
    if (sessionsRes.ok) setSessions(await sessionsRes.json());
  }, []);

  const getRandomMessage = useCallback(() => {
    setShownMessagesToday((prev) => {
      const unusedMessages = MOTIVATION_MESSAGES.filter((msg) => !prev.has(msg));
      const messagesToChoose = unusedMessages.length > 0 ? unusedMessages : MOTIVATION_MESSAGES;
      const randomMsg = messagesToChoose[Math.floor(Math.random() * messagesToChoose.length)];

      const newShown = new Set(prev);
      newShown.add(randomMsg);

      if (typeof window !== "undefined") {
        localStorage.setItem("v2_shown_messages_today", JSON.stringify(Array.from(newShown)));
      }

      setCurrentMessage(randomMsg);
      return newShown;
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (initialTodo) {
      setSelectedTodo(initialTodo);
      // selectedTodo の見積もり時間をデフォルト値として設定
      if (initialTodo.estimated_minutes) {
        setPlannedMinutes(initialTodo.estimated_minutes);
      }
    }
  }, [initialTodo]);

  // selectedTodo が変わったときに見積もり時間とカテゴリを更新
  useEffect(() => {
    if (selectedTodo) {
      if (selectedTodo.estimated_minutes) {
        setPlannedMinutes(selectedTodo.estimated_minutes);
      }
      // selectedTodo のカテゴリを初期値として設定
      setCustomCategory(selectedTodo.category);
    }
  }, [selectedTodo]);

  // タイマー処理
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const secs = Math.floor((now - startTimeRef.current) / 1000);
        setElapsed(secs);

        // 時間になったら通知
        if (secs >= plannedMinutes * 60 && !isFinished) {
          setIsFinished(true);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("⏰ 集中時間終了！", { body: `${plannedMinutes}分の集中が完了しました` });
          }
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, plannedMinutes, isFinished]);

  // メッセージローテーション（5分ごと）
  useEffect(() => {
    if (isRunning) {
      messageIntervalRef.current = setInterval(() => {
        getRandomMessage();
      }, 5 * 60 * 1000); // 5分
    }
    return () => {
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    };
  }, [isRunning, getRandomMessage]);

  const handleStart = async () => {
    // 通知許可を取得
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    const category = customCategory;
    const title = (selectedTodo?.title ?? customTitle) || "集中作業";

    const res = await fetch("/api/v2/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        todo_id: selectedTodo?.id ?? null,
        todo_title: title,
        category,
        planned_minutes: plannedMinutes,
      }),
    });
    if (res.ok) {
      const session = await res.json();
      setActiveSessionId(session.id);
    }

    // 初回メッセージを表示
    getRandomMessage();

    startTimeRef.current = Date.now();
    setElapsed(0);
    setIsRunning(true);
    setIsFinished(false);
  };

  const handlePause = () => setIsRunning(false);
  const handleResume = () => {
    startTimeRef.current = Date.now() - elapsed * 1000;
    setIsRunning(true);
  };

  const handleStop = async () => {
    setIsRunning(false);
    if (activeSessionId) {
      await fetch(`/api/v2/focus/${activeSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual_minutes: Math.round(elapsed / 60) }),
      });
      setActiveSessionId(null);
    }
    setElapsed(0);
    setIsFinished(false);
    fetchData();
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsed(0);
    setIsFinished(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const remaining = Math.max(0, plannedMinutes * 60 - elapsed);
  const progress = Math.min(100, (elapsed / (plannedMinutes * 60)) * 100);
  const remainMins = Math.floor(remaining / 60);
  const remainSecs = remaining % 60;
  const totalFocusToday = sessions.reduce((s, sess) => s + (sess.actual_minutes ?? sess.planned_minutes ?? 0), 0);

  // カテゴリ別集計
  const byCat: Record<string, number> = {};
  sessions.forEach((s) => { byCat[s.category] = (byCat[s.category] ?? 0) + (s.actual_minutes ?? s.planned_minutes ?? 0); });

  const circumference = 2 * Math.PI * 88; // r=88

  return (
    <div className="pb-24 px-4 pt-4">
      {/* タスク選択 */}
      {!isRunning && !isFinished && (
        <div className="mb-6 space-y-2">
          <p className="text-gray-400 text-sm font-medium">何に集中する？</p>
          <select
            value={selectedTodo?.id ?? "custom"}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setSelectedTodo(null);
              } else {
                setSelectedTodo(todos.find((t) => t.id === Number(e.target.value)) ?? null);
              }
            }}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2.5 text-sm"
          >
            <option value="custom">✏ 直接入力</option>
            {todos.map((t) => (
              <option key={t.id} value={t.id}>
                {CATEGORY_EMOJI[t.category] ?? ""} {t.title}
              </option>
            ))}
          </select>
          {!selectedTodo && (
            <div className="flex gap-2">
              <input
                placeholder="集中する内容を入力"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2 text-sm"
              />
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="bg-gray-800 text-white border border-gray-700 rounded-xl px-2 py-2 text-sm"
              >
                {["video", "english", "investment", "ai", "personal"].map((c) => (
                  <option key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </div>
          )}
          {selectedTodo && (
            <div className="flex gap-2">
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2 text-sm"
              >
                {["video", "english", "investment", "ai", "personal", "fitness", "engineer", "life_design"].map((c) => (
                  <option key={c} value={c}>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* タイマー設定 */}
      {!isRunning && !isFinished && (
        <div className="flex gap-2 justify-center mb-6">
          {PRESET_MINUTES.map((m) => (
            <button
              key={m}
              onClick={() => setPlannedMinutes(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${plannedMinutes === m ? "bg-green-700 text-white border-green-600" : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"}`}
            >
              {m}分
            </button>
          ))}
        </div>
      )}

      {/* 円形タイマー */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-52 h-52">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="88" fill="none" stroke="#1f2937" strokeWidth="10" />
            <circle
              cx="100" cy="100" r="88"
              fill="none"
              stroke={isFinished ? "#22c55e" : "#3b82f6"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isFinished ? (
              <>
                <span className="text-4xl">🎉</span>
                <p className="text-green-400 font-bold mt-1">完了！</p>
              </>
            ) : (
              <>
                <p className="text-4xl font-bold text-white tabular-nums">
                  {String(remainMins).padStart(2, "0")}:{String(remainSecs).padStart(2, "0")}
                </p>
                <p className="text-gray-500 text-xs mt-1">残り時間</p>
              </>
            )}
          </div>
        </div>

        {/* 集中中のタスク名 */}
        {(isRunning || isFinished) && (
          <div className="mt-6 text-center space-y-4">
            <p className="text-2xl font-bold text-white px-4 break-words leading-relaxed">
              {selectedTodo ? `${CATEGORY_EMOJI[selectedTodo.category] ?? ""} ${selectedTodo.title}` : customTitle || "集中作業"}
            </p>
            {isRunning && currentMessage && (
              <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-700/50 rounded-xl p-4 mx-2">
                <p className="text-sm text-cyan-300 italic">💡 {currentMessage}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* コントロールボタン */}
      <div className="flex justify-center gap-3 mb-8">
        {!isRunning && !activeSessionId && !isFinished && (
          <button
            onClick={handleStart}
            disabled={!selectedTodo && !customTitle.trim()}
            className="px-8 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl font-bold text-lg transition-colors"
          >
            ▶ 開始
          </button>
        )}
        {isRunning && (
          <>
            <button onClick={handlePause} className="px-6 py-3 bg-yellow-700 hover:bg-yellow-600 text-white rounded-xl font-medium transition-colors">
              ⏸ 一時停止
            </button>
            <button onClick={handleStop} className="px-6 py-3 bg-red-800 hover:bg-red-700 text-white rounded-xl font-medium transition-colors">
              ■ 終了
            </button>
          </>
        )}
        {!isRunning && activeSessionId && !isFinished && (
          <>
            <button onClick={handleResume} className="px-6 py-3 bg-green-700 hover:bg-green-600 text-white rounded-xl font-medium transition-colors">
              ▶ 再開
            </button>
            <button onClick={handleStop} className="px-6 py-3 bg-red-800 hover:bg-red-700 text-white rounded-xl font-medium transition-colors">
              ■ 終了
            </button>
          </>
        )}
        {isFinished && (
          <>
            <button onClick={handleStop} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors">
              ✓ 完了して記録
            </button>
            <button onClick={handleReset} className="px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-medium transition-colors">
              ↺ リセット
            </button>
          </>
        )}
      </div>

      {/* 今日の集中サマリー */}
      {sessions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm font-medium mb-3">今日の集中 合計 {totalFocusToday}分</p>
          <div className="space-y-1.5">
            {Object.entries(byCat).map(([cat, min]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-sm w-5">{CATEGORY_EMOJI[cat] ?? "📌"}</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${totalFocusToday > 0 ? (min / totalFocusToday) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-12 text-right">{min}分</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
