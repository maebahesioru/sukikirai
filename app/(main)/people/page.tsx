import Link from "next/link";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getAllTags, getPeople, type PeopleSort } from "@/lib/queries";
import PersonCard from "@/components/PersonCard";
import { CATEGORIES } from "@/lib/constants";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
  title: "人物一覧",
  description: "登録されている全人物の一覧。タグ・カテゴリ・並び替え・検索で気になる人を探せます。",
  alternates: { canonical: localePath(locale, "/people") },
  };
}

const PER = 48;
const SORTS: { key: PeopleSort; label: string }[] = [
  { key: "like", label: "好き率順" },
  { key: "votes", label: "投票数順" },
  { key: "new", label: "新着順" },
  { key: "name", label: "名前順" },
];

type SP = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export default async function PeoplePage({ searchParams }: { searchParams: SP }) {
  const t = await getServerT();
  const sp = await searchParams;
  const q = one(sp.q);
  const tag = one(sp.tag);
  const cat = one(sp.cat);
  const sortRaw = one(sp.sort);
  const sort: PeopleSort = (["new", "name", "votes", "like"] as string[]).includes(sortRaw)
    ? (sortRaw as PeopleSort)
    : "like";
  const page = Math.max(1, parseInt(one(sp.page), 10) || 1);

  const [{ rows, total }, tags] = await Promise.all([
    getPeople({ q, tag, category: cat, sort, page, perPage: PER }),
    getAllTags(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER));

  const href = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    const base: Record<string, string> = { q, tag, cat, sort, page: String(page), ...over };
    for (const [k, v] of Object.entries(base)) {
      if (v && !(k === "page" && v === "1")) u.set(k, v);
    }
    const s = u.toString();
    return s ? `/people?${s}` : "/people";
  };

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h1 className="text-2xl font-black mb-1">{t("人物一覧")}</h1>
        <p className="text-sm text-mut mb-4">
          {t("登録されている全{n}人を表示中。XのID（@xxx）を検索すると新しいユーザーも追加できます。", { n: total })}
        </p>
        <form method="get" action="/people" className="flex gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mut" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder={t("名前・IDで検索")}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
            />
          </div>
          {tag && <input type="hidden" name="tag" value={tag} />}
          {cat && <input type="hidden" name="cat" value={cat} />}
          {sort !== "like" && <input type="hidden" name="sort" value={sort} />}
          <button type="submit" className="px-4 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition">
            {t("検索")}
          </button>
        </form>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-panel border border-line rounded-2xl p-4">
            <h2 className="font-bold text-sm mb-2">{t("カテゴリ")}</h2>
            <div className="flex flex-col gap-0.5 text-sm">
              <Link
                href={href({ cat: "", page: "1" })}
                className={`px-2.5 py-1.5 rounded-lg transition ${!cat ? "bg-xsoft text-x font-bold" : "text-mut hover:text-txt hover:bg-panel2"}`}
              >
                {t("すべて")}
              </Link>
              {CATEGORIES.map((c) => (
                <Link
                  key={c}
                  href={href({ cat: c, page: "1" })}
                  className={`px-2.5 py-1.5 rounded-lg transition ${cat === c ? "bg-xsoft text-x font-bold" : "text-mut hover:text-txt hover:bg-panel2"}`}
                >
                  {t(c)}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-panel border border-line rounded-2xl p-4">
            <h2 className="font-bold text-sm mb-2">{t("並び替え")}</h2>
            <div className="flex flex-col gap-0.5 text-sm">
              {SORTS.map((s) => (
                <Link
                  key={s.key}
                  href={href({ sort: s.key, page: "1" })}
                  className={`px-2.5 py-1.5 rounded-lg transition ${sort === s.key ? "bg-xsoft text-x font-bold" : "text-mut hover:text-txt hover:bg-panel2"}`}
                >
                  {t(s.label)}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-panel border border-line rounded-2xl p-4">
            <h2 className="font-bold text-sm mb-2">{t("タグ")}</h2>
            <div className="flex flex-wrap gap-1.5">
              <Link
                href={href({ tag: "", page: "1" })}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  !tag ? "bg-x text-white border-x" : "bg-panel2 text-mut border-line hover:text-txt"
                }`}
              >
                {t("すべて")}
              </Link>
              {tags.slice(0, 40).map((tg) => (
                <Link
                  key={tg.tag}
                  href={`/tag/${encodeURIComponent(tg.tag)}`}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    tag === tg.tag
                      ? "bg-x text-white border-x"
                      : "bg-panel2 text-mut border-line hover:text-txt"
                  }`}
                >
                  {tg.tag}{t("（{n}）", { n: tg.count })}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3">
          <div className="text-sm text-mut mb-3">
            {q && <>{t("「{q}」の検索結果：", { q })}</>}
            {t("{n}人", { n: total })}{totalPages > 1 && t("（{page}/{total}ページ）", { page, total: totalPages })}
          </div>
          {rows.length === 0 ? (
            <div className="bg-panel border border-line rounded-2xl p-10 text-center text-mut">
              {t("該当する人物が見つかりませんでした。")}
              <br />
              <Link href="/search" className="text-x hover:underline">
                {t("Xユーザーを検索・追加する")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {rows.map((p) => (
                <PersonCard key={p.id} p={p} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              {page > 1 && (
                <Link href={href({ page: String(page - 1) })} className="px-4 py-2 rounded-lg bg-panel2 border border-line text-sm hover:border-line2 transition">
                  {t("前へ")}
                </Link>
              )}
              <span className="text-sm text-mut">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={href({ page: String(page + 1) })} className="px-4 py-2 rounded-lg bg-panel2 border border-line text-sm hover:border-line2 transition">
                  {t("次へ")}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
