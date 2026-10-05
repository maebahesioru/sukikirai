import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { getServerT } from "@/lib/i18n-server";

export default async function Footer() {
  const t = await getServerT();
  return (
    <footer className="border-t border-line mt-10">
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-mut space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-bold text-txt">{t(SITE_NAME)}</span>
          <Link href="/terms" className="hover:text-txt transition">
            {t("利用規約")}
          </Link>
          <Link href="/ranking/popularity" className="hover:text-txt transition">
            {t("ランキング")}
          </Link>
          <Link href="/today" className="hover:text-txt transition">
            {t("今日のまとめ")}
          </Link>
          <Link href="/sousenkyo" className="hover:text-txt transition">
            {t("総選挙")}
          </Link>
          <Link href="/people" className="hover:text-txt transition">
            {t("人物一覧")}
          </Link>
          <Link href="/meta" className="hover:text-txt transition">
            {t("管理スレ（要望・バグ報告）")}
          </Link>
        </div>
        <p className="leading-relaxed">
          {t(
            "本サイトは誰でも匿名でXユーザーの好き嫌い・評価を書き込める非公式のまとめサイトです。X Corp. および各対象者とは関係ありません。誹謗中傷・個人情報の投稿は禁止です。"
          )}
        </p>
        <p>
          {t("姉妹サイト:")}{" "}
          <a
            href="https://nareaitter.hikamers.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-txt underline-offset-2 hover:underline transition"
          >
            {t("Twitter馴れ合いサークル（馴れ合い表）")}
          </a>
          <span className="ml-2">{t("Xの交流相手をグリッドで一覧表示するツール")}</span>
        </p>
        <p>© {new Date().getFullYear()} {SITE_NAME}</p>
      </div>
    </footer>
  );
}
