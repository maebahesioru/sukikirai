/**
 * ツイッタラーズイカゲーム（2026-11-05 開始・29日間）の定義と純粋関数。
 * ここには DB アクセスを書かない（lib/squid-queries.ts 側）。
 */

export const SQUID = {
  slug: "squid",
  title: "ツイッタラーズイカゲーム",
  emoji: "🦑",
  /** 1日目の 0:00 JST */
  startIso: "2026-11-05T00:00:00+09:00",
  totalDays: 29,
  /** 毎日 0:00 に落とす割合 */
  cutRate: 0.24,
  /** 天空イカゲームの 6時間ごとの割合 */
  skyCutRate: 0.5,
  skyFromDay: 26,
  skySlotMs: 6 * 3600000,
  periodLabel: "11/5(木) 0:00 〜 12/3(木) 23:59",
} as const;

export const DAY_MS = 86400000;
const START_MS = new Date(SQUID.startIso).getTime();

export type StageModifier =
  | "raw"
  | "clip10"
  | "pair10"
  | "pairlike"
  | "pentathlon"
  | "jumprope"
  | "sky";

export type Stage = {
  slug: string;
  title: string;
  emoji: string;
  from: number;
  to: number;
  rule: string;
  modifier: StageModifier;
};

export const STAGES: Stage[] = [
  {
    slug: "daruma",
    title: "だるまさんが転んだ",
    emoji: "🧍",
    from: 1,
    to: 5,
    rule: "ふつうにポイントを稼ぐ5日間。稼いだ分がそのまま累積に乗ります。",
    modifier: "raw",
  },
  {
    slug: "tug",
    title: "綱引き",
    emoji: "🪢",
    from: 6,
    to: 9,
    rule: "10人チームで引っ張り合い。個人の1日ぶんは +10pt で頭打ち（下振れは -10pt まで）。",
    modifier: "clip10",
  },
  {
    slug: "marbles",
    title: "ビー玉",
    emoji: "🔮",
    from: 10,
    to: 13,
    rule: "累積順位が隣どうしの2人でペア。4日間のペア合計が10ptに届けば2人とも保持。届かなければ、単独5ptに先に届いた方だけが得点を残せます。",
    modifier: "pair10",
  },
  {
    slug: "ttakji",
    title: "めんこ",
    emoji: "🃏",
    from: 14,
    to: 17,
    rule: "「好き」をもらった数が近い者どうしでペア。4日間の得点が多い方が勝ち、負けた方はこのステージの得点が0に。同点なら両者とも残ります。",
    modifier: "pairlike",
  },
  {
    slug: "pentathlon",
    title: "近代五種",
    emoji: "🏅",
    from: 18,
    to: 21,
    rule: "投票された数・評価された数・コメントされた数・もらった「好き」・連続日数の5種目で順位点を競います（もらった「好き」は0.5倍）。4日ぶんを最終日にまとめて加算。",
    modifier: "pentathlon",
  },
  {
    slug: "jumprope",
    title: "大縄跳び",
    emoji: "⭕",
    from: 22,
    to: 25,
    rule: "その日に生存者の60%以上が動けば全員そのまま。届かなければその日の下位30%の得点が0になります。",
    modifier: "jumprope",
  },
  {
    slug: "sky",
    title: "天空イカゲーム",
    emoji: "☁️",
    from: 26,
    to: 29,
    rule: "累積点がそのまま「高度」。獲得点は0.5倍。6時間ごとに下位半分が落ちます。",
    modifier: "sky",
  },
];

export function stageOfDay(day: number): Stage {
  const s = STAGES.find((x) => day >= x.from && day <= x.to);
  return s ?? STAGES[STAGES.length - 1];
}

/** 1日目の 0:00 JST（epoch ms） */
export function dayStartMs(day: number): number {
  return START_MS + (day - 1) * DAY_MS;
}

/** JST 暦日の境界（そのまま SQL の >= / < に渡せる ISO 文字列） */
export function dayRange(day: number): { startIso: string; endIso: string } {
  return {
    startIso: new Date(dayStartMs(day)).toISOString(),
    endIso: new Date(dayStartMs(day + 1)).toISOString(),
  };
}

/** 今日が何日目か（開始前は 0、終了後は 30 以上） */
export function squidDay(now: Date = new Date()): number {
  const t = now.getTime() - START_MS;
  if (t < 0) return 0;
  return Math.floor(t / DAY_MS) + 1;
}

/** 次の脱落判定時刻 */
export function nextCutAt(now: Date = new Date()): Date {
  const day = squidDay(now);
  if (day < 1) return new Date(START_MS);
  if (day >= SQUID.skyFromDay) {
    const skyStart = dayStartMs(SQUID.skyFromDay);
    const elapsed = Math.max(0, now.getTime() - skyStart);
    const slot = Math.floor(elapsed / SQUID.skySlotMs);
    if (day > SQUID.totalDays) return new Date(dayStartMs(SQUID.totalDays + 1));
    return new Date(skyStart + (slot + 1) * SQUID.skySlotMs);
  }
  return new Date(dayStartMs(day + 1));
}

export type RankRow = {
  personId: string;
  cum: number;
  today: number;
  lastMs: number;
};

export function sameRankKey(a: RankRow, b: RankRow): boolean {
  return a.cum === b.cum && a.today === b.today && a.lastMs === b.lastMs;
}

/** 累積pt降順 → 当日pt降順 → 最終行動が新しい順 */
export function sortRank(rows: RankRow[]): RankRow[] {
  return rows.slice().sort((a, b) => {
    if (b.cum !== a.cum) return b.cum - a.cum;
    if (b.today !== a.today) return b.today - a.today;
    if (b.lastMs !== a.lastMs) return b.lastMs - a.lastMs;
    return a.personId < b.personId ? -1 : a.personId > b.personId ? 1 : 0;
  });
}

/**
 * 降順ソート済みの生存者から下位 rate を落とす。境界に同点が並ぶ場合は
 * その同点グループ全員を生存させる（＝落とす人数が減る）。
 */
export function cutBoundary(
  sorted: RankRow[],
  rate: number
): { boundary: number; eliminate: number; cutline: number | null } {
  const n = sorted.length;
  if (n <= 1) return { boundary: n, eliminate: 0, cutline: null };
  let cut = Math.floor(n * rate);
  if (cut < 1) cut = 1;
  if (cut > n - 1) cut = n - 1;
  let boundary = n - cut;
  while (boundary > 1 && sameRankKey(sorted[boundary - 1], sorted[boundary])) boundary--;
  if (boundary < 1) boundary = 1;
  return { boundary, eliminate: n - boundary, cutline: sorted[boundary - 1]?.cum ?? null };
}

/** 表示用のポイント整形 */
export function fmtPts(v: number): string {
  if (!Number.isFinite(v)) return "0";
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
