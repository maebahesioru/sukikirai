"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skull, Timer, Trophy } from "lucide-react";
import type { SquidState } from "@/lib/squid-queries";
import { useT } from "@/lib/i18n-client";
import { num } from "@/lib/format";

function fmtCd(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return [h, m, ss].map((v) => String(v).padStart(2, "0")).join(":");
}

const card = "bg-panel border border-line rounded-2xl p-4";
const ptsFmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export default function SquidHub({ initial, siteName }: { initial: SquidState; siteName: string }) {
  const t = useT();
  const [state, setState] = useState<SquidState>(initial);
  // SSR とのハイドレーション差異を避けるため、マウント後に初めて時刻を入れる
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setLeft(Date.parse(state.nextCutAtIso) - Date.now());
    update();
    const tick = setInterval(update, 1000);
    return () => clearInterval(tick);
  }, [state.nextCutAtIso]);

  // 5分ごとに状態を取り直す（サーバ側も5分キャッシュ）
  useEffect(() => {
    let alive = true;
    const timer = setInterval(async () => {
      try {
        const r = await fetch("/api/squid/state", { cache: "no-store" });
        const j = await r.json();
        if (!alive || !j?.success) return;
        const { success, ...rest } = j as { success: boolean } & SquidState;
        void success;
        setState(rest as SquidState);
      } catch {
        /* 失敗時は次の周期で再試行 */
      }
    }, 5 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const before = !state.started;
  const pct = state.total > 0 ? Math.round((state.alive / state.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden bg-panel border border-line rounded-3xl p-6">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-dislike/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-bold text-mut">
            <span aria-hidden>🦑</span>
            {t("全スレッド参加・脱落式サバイバル")}
            <span className="px-2 py-0.5 rounded-full bg-xsoft text-x border border-x/40">
              {before ? t("開催前") : state.finished ? t("終了") : t("Day {d}/{n}", { d: state.day, n: state.totalDays })}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black mt-2">{t("ツイッタラーズイカゲーム")}</h1>
          <p className="text-sm text-mut mt-1">
            {t("11/5(木) 0:00 〜 12/3(木) 23:59")} ｜ {t("毎日0時に累積ポイント下位24%が脱落")} ｜ {siteName}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            <div className="bg-panel2 border border-line rounded-xl p-3">
              <div className="text-[11px] text-mut">{t("生存")}</div>
              <div className="text-xl font-black">{num(state.alive)}</div>
            </div>
            <div className="bg-panel2 border border-line rounded-xl p-3">
              <div className="text-[11px] text-mut">{t("脱落")}</div>
              <div className="text-xl font-black">{num(state.eliminatedTotal)}</div>
            </div>
            <div className="bg-panel2 border border-line rounded-xl p-3">
              <div className="text-[11px] text-mut">{t("今日のカットライン")}</div>
              <div className="text-xl font-black">{state.cutline === null ? "—" : ptsFmt(state.cutline)}</div>
            </div>
            <div className="bg-panel2 border border-line rounded-xl p-3">
              <div className="text-[11px] text-mut flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {t("次回判定まで")}
              </div>
              <div className="text-xl font-black tabular-nums">{left === null ? "—" : fmtCd(left)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{state.stage.emoji}</span>
          <h2 className="font-bold text-sm">{t(state.stage.title)}</h2>
          <span className="text-[11px] text-mut">
            {t("Day {a}–{b}", { a: state.day, b: state.day })}
          </span>
        </div>
        <p className="text-sm text-mut leading-relaxed">{t(state.stage.rule)}</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className={card}>
          <h2 className="font-bold text-sm mb-3 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-x" />
            {t("生存者ランキング")}
          </h2>
          {state.top.length === 0 ? (
            <p className="text-sm text-mut">{t("まだ参加者がいません")}</p>
          ) : (
            <ol className="space-y-1.5">
              {state.top.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="w-6 text-right text-mut tabular-nums">{i + 1}</span>
                  <Link href={`/person/${p.id}`} className="min-w-0 flex-1 truncate hover:text-x transition">
                    {p.name}
                  </Link>
                  <span className="font-bold tabular-nums">{ptsFmt(p.pts)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={card}>
          <h2 className="font-bold text-sm mb-3 flex items-center gap-1.5">
            <Skull className="w-4 h-4 text-dislike" />
            {t("最近の脱落者")}
          </h2>
          {state.fallen.length === 0 ? (
            <p className="text-sm text-mut">{t("まだ脱落者はいません")}</p>
          ) : (
            <ul className="space-y-1.5">
              {state.fallen.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="text-[11px] text-mut tabular-nums w-12">{t("Day {d}", { d: p.day })}</span>
                  <Link href={`/person/${p.id}`} className="min-w-0 flex-1 truncate text-mut hover:text-x transition">
                    {p.name}
                  </Link>
                  <span className="text-mut tabular-nums">{ptsFmt(p.pts)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={card}>
        <h2 className="font-bold text-sm mb-3">{t("これまでの脱落")}</h2>
        {state.days.length === 0 ? (
          <p className="text-sm text-mut">{t("判定は11/6 0:00から始まります")}</p>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {state.days.map((d) => {
              const max = Math.max(1, ...state.days.map((x) => x.eliminated));
              const h = Math.round((d.eliminated / max) * 100);
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`Day ${d.day}: -${d.eliminated}`}>
                  <div className="w-full bg-dislike/60 rounded-t" style={{ height: `${h}%` }} />
                  <span className="text-[9px] text-mut">{d.day}</span>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-mut mt-3">
          {t("残り {p}%（{a}/{b}）", { p: pct, a: num(state.alive), b: num(state.total) })}
        </p>
      </section>

      <section className={card}>
        <h2 className="font-bold text-sm mb-2">{t("ルール")}</h2>
        <ul className="text-sm text-mut space-y-1 list-disc pl-5">
          <li>{t("登録スレッドは全員自動参加（エントリー不要）")}</li>
          <li>{t("毎日0:00（JST）に累積ポイントの下位24%が脱落。脱落は取り消されません")}</li>
          <li>{t("ポイントは投票の好き(+1.0)/嫌い(-0.5)、評価(+1.5/-1.0)、コメントへのいいね(+2.0/-1.5)")}</li>
          <li>{t("同点は当日ポイント→最終行動時刻で決め、それでも同点なら全員生存")}</li>
          <li>{t("最終盤（Day26〜29）は6時間ごとに下位半分が脱落")}</li>
        </ul>
      </section>
    </div>
  );
}
