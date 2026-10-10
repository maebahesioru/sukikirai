import Link from "next/link";
import { Suspense } from "react";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import { ArrowRight, Star, ThumbsUp, ThumbsDown, TrendingUp, Trophy } from "lucide-react";
import { getHomeStats, getPeople, getRanking, getRecentComments } from "@/lib/queries";
import { SOUSENKYO, ELECTION } from "@/lib/constants";
import HeroSearch from "@/components/HeroSearch";
import PersonCard from "@/components/PersonCard";
import Sidebar from "@/components/Sidebar";
import Avatar from "@/components/Avatar";
import EmojiText from "@/components/EmojiText";
import { num } from "@/lib/format";
import type { Metadata } from "next";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
  alternates: { canonical: localePath(locale, "/") },
  };
}

export const dynamic = "force-dynamic";

/* ---------- データ取得セクション（Suspenseでストリーミング表示） ---------- */

async function HomeStats() {
  const t = await getServerT();
  const stats = await getHomeStats();
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 mt-7 text-sm">
      <Stat label={t("登録人物")} value={num(stats.people)} />
      <Stat label={t("総投票数")} value={num(stats.votes)} />
      <Stat label={t("コメント")} value={num(stats.comments)} />
      <Stat label={t("今日の投票")} value={num(stats.today_votes)} accent />
    </div>
  );
}

async function DailyTrending() {
  const t = await getServerT();
  const daily = await getRanking("daily", 10);
  return (
    <section className="bg-panel border border-line rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-x" />
          {t("24時間の急上昇")}
        </h2>
        <Link href="/ranking/daily" className="text-xs text-x hover:underline flex items-center gap-0.5">
          {t("もっと見る")} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-1.5">
        {daily.map((p, i) => (
          <Link
            key={p.id}
            href={`/person/${p.id}`}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-panel2 transition"
          >
            <span
              className={`w-6 text-center text-sm font-black shrink-0 ${
                i === 0 ? "text-gold" : i === 1 ? "text-mut" : i === 2 ? "text-amber-600" : "text-mut/60"
              }`}
            >
              {i + 1}
            </span>
            <Avatar name={p.name} avatarUrl={p.avatar_url} size={34} />
            <span className="text-sm font-medium truncate flex-1"><EmojiText text={p.name} /></span>
            <span className="text-xs font-bold text-x shrink-0">{t("{n}票", { n: p.recentVotes ?? 0 })}</span>
          </Link>
        ))}
        {daily.length === 0 && <p className="text-sm text-mut text-center py-4">{t("まだデータがありません")}</p>}
      </div>
    </section>
  );
}

async function NewPeople() {
  const t = await getServerT();
  const newPeople = await getPeople({ sort: "new", perPage: 6 });
  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-bold">{t("最近追加されたXユーザー")}</h2>
        <Link href="/people?sort=new" className="text-xs text-x hover:underline flex items-center gap-0.5">
          {t("一覧へ")} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {newPeople.rows.map((p) => (
          <PersonCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

async function ScoreTop() {
  const t = await getServerT();
  const scoreTop = await getRanking("score", 5);
  if (scoreTop.length === 0) return null;
  return (
    <section className="bg-panel border border-line rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2">
          <Star className="w-4 h-4 text-gold" />
          {t("総合評価ランキング")}
        </h2>
        <Link href="/ranking/score" className="text-xs text-x hover:underline flex items-center gap-0.5">
          {t("もっと見る")} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-1.5">
        {scoreTop.map((p, i) => (
          <Link
            key={p.id}
            href={`/person/${p.id}`}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-panel2 transition"
          >
            <span className={`w-6 text-center text-sm font-black shrink-0 ${i === 0 ? "text-gold" : "text-mut/70"}`}>
              {i + 1}
            </span>
            <Avatar name={p.name} avatarUrl={p.avatar_url} size={34} />
            <span className="text-sm font-medium truncate flex-1"><EmojiText text={p.name} /></span>
            <span className="text-sm font-bold text-gold shrink-0">
              {p.overall != null ? p.overall.toFixed(2) : "—"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

async function SidebarSection() {
  const [trending, recent] = await Promise.all([getRanking("trending", 10), getRecentComments(6)]);
  return <Sidebar trending={trending} recentComments={recent} />;
}

/* ---------- スケルトン（ストリーミング中のプレースホルダ） ---------- */

function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-panel2 ${className}`} />;
}

function StatsSkeleton() {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 mt-7 text-sm">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-1.5">
          <Pulse className="h-5 w-12" />
          <Pulse className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1.5 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Pulse className="h-4 w-6" />
          <Pulse className="h-[34px] w-[34px] rounded-full" />
          <Pulse className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

function SectionSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <section className="bg-panel border border-line rounded-2xl p-5">
      <Pulse className="h-5 w-32 mb-4" />
      <ListSkeleton rows={rows} />
    </section>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-panel border border-line rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Pulse className="h-11 w-11 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Pulse className="h-4 w-24" />
              <Pulse className="h-3 w-16" />
            </div>
          </div>
          <Pulse className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="space-y-4">
      <div className="bg-panel border border-line rounded-2xl p-5">
        <Pulse className="h-5 w-28 mb-4" />
        <ListSkeleton rows={5} />
      </div>
      <div className="bg-panel border border-line rounded-2xl p-5">
        <Pulse className="h-5 w-28 mb-4" />
        <ListSkeleton rows={3} />
      </div>
    </aside>
  );
}

/* ---------- ページ本体（シェルは即時返し、セクションはストリーミング） ---------- */

export default async function HomePage() {
  const t = await getServerT();
  const locale = await getLocale();
  const now = Date.now();
  const skStart = Date.parse(SOUSENKYO.startIso);
  const skEnd = Date.parse(SOUSENKYO.endIso);
  const skPhase: "before" | "live" | "after" = now < skStart ? "before" : now <= skEnd ? "live" : "after";
  const jstNow = new Date(now + 9 * 3600_000);
  const todayLabel = `${jstNow.getUTCMonth() + 1}/${jstNow.getUTCDate()}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* 衆院選バナー */}
        <Link
          href="/election"
          className="block bg-gradient-to-r from-x/15 via-panel to-x/10 border border-line rounded-2xl p-4 hover:border-line2 transition group"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg shrink-0">🗳️</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm group-hover:text-x transition">{t(ELECTION.title)}</div>
              <div className="text-xs text-mut mt-0.5">
                {t("開催中！10/24(土)まで — 289選挙区+176比例・毎日投票で推しの議席を獲れ")}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-mut shrink-0" />
          </div>
        </Link>

        {/* Hero */}
        <section className="relative overflow-hidden bg-panel border border-line rounded-3xl p-6 md:p-10">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-like/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-dislike/20 blur-3xl" />
          <div className="relative">
            <h1 className="text-3xl md:text-5xl font-black leading-tight">
              {t("あのツイッタラーのこと、")}{" "}
              <span className="text-like">{t("好き？")}</span>
              {locale === "ja" ? null : " "}
              <span className="text-dislike">{t("嫌い？")}</span>
            </h1>
            <p className="text-mut mt-4 max-w-xl leading-relaxed text-sm md:text-base">
              {t(
                "X全体のツイッタラーたちの「好き嫌い」と「8項目評価」をみんなで書き込める匿名サイトです。@IDで検索すると未登録のXユーザーもその場で追加できます。"
              )}
            </p>
            <div className="mt-6">
              <HeroSearch />
            </div>
            <Suspense fallback={<StatsSkeleton />}>
              <HomeStats />
            </Suspense>
            <div className="mt-5">
              <Link href="/today" className="inline-flex items-center gap-1.5 text-sm text-x hover:underline font-medium">
                {t("今日のまとめ（{date}）を見る", { date: todayLabel })} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Ranking shortcuts */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <RankLink href="/ranking/popularity" icon={<ThumbsUp className="w-5 h-5" />} title={t("好感度")} desc={t("好き率が高い人")} color="text-like" />
          <RankLink href="/ranking/unpopular" icon={<ThumbsDown className="w-5 h-5" />} title={t("不人気")} desc={t("嫌い率が高い人")} color="text-dislike" />
          <RankLink href="/ranking/trending" icon={<TrendingUp className="w-5 h-5" />} title={t("トレンド")} desc={t("今週の急上昇")} color="text-x" />
          <RankLink href="/ranking/score" icon={<Star className="w-5 h-5" />} title={t("総合評価")} desc={t("8項目の平均点")} color="text-gold" />
        </section>

        {/* Trending (24h) */}
        <Suspense fallback={<SectionSkeleton rows={10} />}>
          <DailyTrending />
        </Suspense>

        {/* New people */}
        <Suspense fallback={<CardsSkeleton />}>
          <NewPeople />
        </Suspense>

        {/* Score top */}
        <Suspense fallback={<SectionSkeleton rows={5} />}>
          <ScoreTop />
        </Suspense>
      </div>

      <div className="lg:col-span-1">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarSection />
        </Suspense>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-lg font-black ${accent ? "text-x" : ""}`}>{value}</div>
      <div className="text-xs text-mut">{label}</div>
    </div>
  );
}

function RankLink({
  href,
  icon,
  title,
  desc,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="bg-panel border border-line rounded-2xl p-4 hover:border-line2 transition group"
    >
      <div className={`mb-2 ${color}`}>{icon}</div>
      <div className="font-bold text-sm group-hover:text-x transition">{title}</div>
      <div className="text-xs text-mut mt-0.5">{desc}</div>
    </Link>
  );
}
