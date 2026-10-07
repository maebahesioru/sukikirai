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
            "当サイトは「ヒカマーの十時間_mania」が運営する匿名・無法地帯の本音投票所です。誹謗中傷も辛辣な意見もそのままどうぞ。投稿ログは一切保存していません。任意の開示請求には応じません。"
          )}
        </p>
        <p className="leading-relaxed text-xs">
          {t(
            "運営: ヒカマーの十時間_mania（@maebahesioru2）｜※個人情報の晒し等、法令上明らかな問題がある投稿のみ非表示にすることがあります。"
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
        <p>
          {t("関連:")}{" "}
          <a
            href="https://hikamers.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-txt underline-offset-2 hover:underline transition"
          >
            {t("ヒカマーwiki")}
          </a>
          <span className="ml-2">{t("ヒカマー界隈の百科事典")}</span>
        </p>
        <p>
          {t("関連:")}{" "}
          <a
            href="https://hikamersnews.hikamers.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-txt underline-offset-2 hover:underline transition"
          >
            {t("ヒカマズ通信")}
          </a>
          <span className="ml-2">{t("ヒカマー界隈のニュースサイト")}</span>
        </p>
        <p>
          {t("Tor版:")}{" "}
          <a
            href="http://ywaiur4lrnbeye7uxq3vl6h256glfvzv26ggppvmqinrq3bm6dqartad.onion/"
            className="text-txt underline-offset-2 hover:underline transition break-all"
          >
            ywaiur4lrnbeye7uxq3vl6h256glfvzv26ggppvmqinrq3bm6dqartad.onion
          </a>
          <span className="ml-2">{t("（Tor Browser用・検閲なし・完全匿名）")}</span>
          <a
            href="https://onion.live/site/tsuittara-yoron-chosa"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-txt underline-offset-2 hover:underline transition"
          >
            Verified on onion.live
          </a>
        </p>
        <p>© {new Date().getFullYear()} {SITE_NAME}</p>
      </div>
    </footer>
  );
}
