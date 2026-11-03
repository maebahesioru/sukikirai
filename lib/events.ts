import { ELECTION, SOUSENKYO } from "./constants";
import { SQUID } from "./squid";

export type EventCard = {
  slug: string;
  title: string;
  emoji: string;
  periodLabel: string;
  summary: string;
  href: string;
  cta: string;
  badge?: string;
};

/** 開催中・これからのイベント */
export const LIVE_EVENTS: EventCard[] = [
  {
    slug: SQUID.slug,
    title: SQUID.title,
    emoji: SQUID.emoji,
    periodLabel: SQUID.periodLabel + "（29日間）",
    summary:
      "全スレッド参加・脱落あり。いつもの投票・評価・コメントがそのままポイントになり、毎日0:00に累積下位24%が脱落します。",
    href: "/squid",
    cta: "生存状況を見る",
    badge: "開催中",
  },
];

/** 終了したイベント（結果はそのまま残しています） */
export const PAST_EVENTS: EventCard[] = [
  {
    slug: "shugiin-2026",
    title: ELECTION.title,
    emoji: "🗳️",
    periodLabel: ELECTION.periodLabel,
    summary:
      "全登録ユーザーが300の小選挙区と10党にランダム配属され、「好き」票（嫌い票は-0.5）で議席を争った3週間イベント。比例復活あり。",
    href: "/election",
    cta: "結果を見る",
    badge: "終了",
  },
  {
    slug: "sousenkyo-2026",
    title: SOUSENKYO.title,
    emoji: "🏛️",
    periodLabel: SOUSENKYO.periodLabel,
    summary:
      "衆院選の準備として予定していた第1回。2026-10-10 の衆院選開催決定に伴い中止となりました（ページは記録として残しています）。",
    href: "/sousenkyo",
    cta: "記録を見る",
    badge: "中止",
  },
];

export const ALL_EVENTS: EventCard[] = [...LIVE_EVENTS, ...PAST_EVENTS];
