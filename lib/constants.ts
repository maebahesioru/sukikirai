// アプリ共通の定数

export const CATEGORIES = [
  "ヒカマー",
  "YouTuber",
  "配信者",
  "Vtuber",
  "クリエイター",
  "BOT",
  "企業・サービス",
  "芸能人",
  "政治家",
  "政治・時事",
  "学生",
  "アニメ・ゲーム好き",
  "スポーツ好き",
  "鉄道好き",
  "その他",
] as const;
export type Category = (typeof CATEGORIES)[number];
export const DEFAULT_CATEGORY: Category = "その他";

// 8項目の5段階評価
export const EVAL_ITEMS = [
  { key: "fun", label: "面白さ" },
  { key: "accuracy", label: "正確さ" },
  { key: "influence", label: "発信力" },
  { key: "knowledge", label: "知識・教養" },
  { key: "humanity", label: "人間性" },
  { key: "charisma", label: "カリスマ性" },
  { key: "favor", label: "好感度" },
  { key: "reply", label: "返信・対応" },
] as const;

export type EvalItemKey = (typeof EVAL_ITEMS)[number]["key"];
export const EVAL_KEYS: EvalItemKey[] = EVAL_ITEMS.map((i) => i.key);

export const GENDERS = ["男性", "女性", "その他"] as const;
export const AGE_GROUPS = [
  "10代未満",
  "10代",
  "20代",
  "30代",
  "40代",
  "50代",
  "60代以上",
] as const;

export const COMMENTS_PER_PAGE = 20;
export const MAX_COMMENT_CHARS = 280; // 全角140文字相当
export const MAX_NAME_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 500;

// 管理スレ（要望・バグ報告）: 単一固定スレッド。スレキー=createdAtのepoch秒（2ch互換）
export const META_THREAD = {
  id: "meta",
  title: "管理スレ（要望・バグ報告・その他）",
  createdAt: "2026-10-04T08:40:00.000Z",
} as const;

// 投票は1日1回（JSTの日付が変わるまで）
export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 通報理由（モーダルとAPIで共通）
export const REPORT_REASONS = [
  "殺害・爆破予告",
  "個人情報の晒し",
  "自殺ほのめかし",
  "誹謗中傷・差別的表現",
  "なりすまし・嘘の情報",
  "スパム・宣伝",
  "単に気に入らない",
  "不適切な表現・悪質なネタ",
  "自分のコメントを消してほしい",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// 第1回ツイッタラー総選挙（期間限定イベント・2026-10-05実装）
export const SOUSENKYO = {
  title: "第1回ツイッタラー総選挙",
  startIso: "2026-10-06T00:00:00+09:00",
  endIso: "2026-10-12T23:59:59+09:00",
  periodLabel: "10/6(火) 0:00 〜 10/12(月) 23:59",
} as const;
