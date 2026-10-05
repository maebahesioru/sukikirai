import type { Metadata } from "next";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllTags, getPeople } from "@/lib/queries";
import PersonCard from "@/components/PersonCard";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
};

const PER = 48;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getServerT();
  const { tag: raw } = await params;
  const tag = decodeURIComponent(raw);
  return {
    title: t("「{tag}」の人物一覧", { tag }),
    description: t(
      "「{tag}」タグが付いたXユーザー（ツイッタラー）の一覧。好き嫌い投票・8項目評価・コメントをチェックできます。",
      { tag }
    ),
    alternates: { canonical: localePath(locale, `/tag/${encodeURIComponent(tag)}`) },
    openGraph: {
      title: t("「{tag}」の人物一覧", { tag }),
      description: t(
        "「{tag}」タグが付いたXユーザー（ツイッタラー）の一覧。好き嫌い投票・8項目評価・コメントをチェックできます。",
        { tag }
      ),
      images: ["/og.png"],
    },
  };
}

export default async function TagPage({ params, searchParams }: Props) {
  const t = await getServerT();
  const { tag: raw } = await params;
  const tag = decodeURIComponent(raw);
  const sp = await searchParams;
  const page = Math.max(parseInt(sp.page ?? "1", 10) || 1, 1);

  const [{ rows, total }, tags] = await Promise.all([
    getPeople({ tag, sort: "like", perPage: PER, page }),
    getAllTags(),
  ]);
  if (total === 0) notFound();

  const totalPages = Math.max(Math.ceil(total / PER), 1);
  const otherTags = tags.filter((t) => t.tag !== tag).slice(0, 24);

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-5">
        <p className="text-xs text-mut mb-1">{t("タグ")}</p>
        <h1 className="text-xl font-black">
          {t("「{tag}」の人物一覧", { tag })}
          <span className="text-sm font-normal text-mut ml-2">{t("{n}人", { n: total })}</span>
        </h1>
        <p className="text-sm text-mut mt-2">
          {t("このタグが付いたXユーザーの一覧です（好き率順）。タグはプロフィールから自動判定されます。")}
        </p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((p) => (
          <PersonCard key={p.id} p={p} />
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: Math.min(totalPages, 12) }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`/tag/${encodeURIComponent(tag)}?page=${n}`}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition ${
                n === page ? "border-x bg-xsoft text-x font-bold" : "border-line text-mut hover:text-txt"
              }`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}

      {otherTags.length > 0 && (
        <section className="bg-panel border border-line rounded-2xl p-5">
          <h2 className="font-bold text-sm mb-3">{t("他のタグ")}</h2>
          <div className="flex flex-wrap gap-1.5">
            {otherTags.map((ot) => (
              <Link
                key={ot.tag}
                href={`/tag/${encodeURIComponent(ot.tag)}`}
                className="text-xs px-2.5 py-1 rounded-full border border-line bg-panel2 text-mut hover:text-txt hover:border-line2 transition"
              >
                {ot.tag}
                {t("（{n}）", { n: ot.count })}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
