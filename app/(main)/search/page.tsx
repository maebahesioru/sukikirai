import type { Metadata } from "next";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { findPersonByHandleOrId, normalizeHandle, searchPeople } from "@/lib/queries";
import { findXUserCandidates } from "@/lib/xsearch";
import PersonCard from "@/components/PersonCard";
import XUserCandidates from "@/components/XUserCandidates";
import SearchAutoAdd from "./SearchAutoAdd";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getServerT();
  return {
    title: t("Xユーザーを検索・追加"),
    description: t(
      "XのID（@xxx）や名前で検索。未登録のXユーザーも、X上の候補から選ぶかIDを直接入力すればその場でページを作成して、好き嫌い投票・評価を書き込めます。"
    ),
    alternates: { canonical: localePath(locale, "/search") },
  };
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const t = await getServerT();
  const sp = await searchParams;
  const raw = sp.q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim();
  const handle = q ? normalizeHandle(q) : null;

  const [exact, results] = await Promise.all([
    handle ? findPersonByHandleOrId(handle) : Promise.resolve(null),
    q ? searchPeople(q, 48) : Promise.resolve([]),
  ]);

  const shouldAutoAdd = !!handle && !exact;
  const others = exact ? results.filter((r) => r.id !== exact.id) : results;

  // 名前でヒットしない → X上の候補を探す（SearXNG + fxTwitter）
  const showCandidates = !!q && !handle && !exact && results.length === 0;
  const xCandidates = showCandidates ? await findXUserCandidates(q) : [];

  return (
    <div className="space-y-6">
      <section className="bg-panel border border-line rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <UserPlus className="w-6 h-6 text-x" />
          <h1 className="text-2xl font-black">{t("Xユーザーを検索・追加")}</h1>
        </div>
        <p className="text-sm text-mut mb-5 leading-relaxed">
          {t("XのID（例: ")}
          <span className="text-txt font-mono">@maebahesioru2</span>
          {t("）か名前を入力。名前でヒットしない場合も、X上の候補から選んで追加できます。")}
        </p>
        <form method="get" action="/search" className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mut" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={t("@IDまたは名前（例: @maebahesioru2 / ツイッタラー）")}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
            />
          </div>
          <button
            type="submit"
            className="px-5 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition"
          >
            {t("検索")}
          </button>
        </form>
      </section>

      {exact && (
        <section>
          <h2 className="font-bold mb-3">
            {t("「{q}」が見つかりました", { q })}
          </h2>
          <div className="max-w-md">
            <PersonCard p={{ ...exact, likes: 0, dislikes: 0, total: 0 }} />
          </div>
        </section>
      )}

      {shouldAutoAdd && <SearchAutoAdd query={q} />}

      {!shouldAutoAdd && others.length > 0 && (
        <section>
          <h2 className="font-bold mb-3">
            {t("検索結果{extra}：{n}件", { extra: exact ? t("（ほか）") : "", n: others.length })}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {others.map((p) => (
              <PersonCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {showCandidates && xCandidates.length > 0 && (
        <XUserCandidates query={q} candidates={xCandidates} />
      )}

      {showCandidates && xCandidates.length === 0 && (
        <div className="bg-panel border border-line rounded-2xl p-10 text-center text-mut">
          {t("Xでも「{q}」の候補が見つかりませんでした。", { q })}
          <br />
          <span className="text-sm">
            {t("ID（@から始まる英数字）を直接入力すると確実に追加できます。")}
          </span>
        </div>
      )}

      {!q && (
        <section className="bg-panel border border-line rounded-2xl p-6">
          <h2 className="font-bold mb-4">{t("追加のしかた")}</h2>
          <ol className="space-y-3 text-sm text-mut">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-xsoft text-x font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              {t("上の検索欄にXのID（例: @maebahesioru2）か名前を入力して検索")}
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-xsoft text-x font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              {t("未登録のユーザーは「X上の候補」から選んで追加（IDを直接入れれば即追加）")}
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-xsoft text-x font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              {t("ページで「好き / 嫌い」に投票＆8項目の評価とコメントを書き込めます")}
            </li>
          </ol>
          <p className="text-xs text-mut mt-5">
            {t("※ 誰でも匿名で追加・書き込みができます。誹謗中傷や個人情報の投稿は禁止です。詳しくは")}
            <Link href="/terms" className="text-x hover:underline">
              {t("利用規約")}
            </Link>
            {t("をご覧ください。")}
          </p>
        </section>
      )}
    </div>
  );
}
