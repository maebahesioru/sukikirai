// 2ch専ブラ対応の案内ページ
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "2ch専ブラで使う",
  description: `${SITE_NAME}の2ch専ブラ（JaneStyle・V2C等）対応について。`,
  alternates: { canonical: "/2ch" },
  robots: { index: false },
};

export default function TwochPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6 text-sm leading-relaxed">
      <h1 className="text-xl font-black">2ch専ブラで使う</h1>
      <p>
        {SITE_NAME}は2ch互換の板を公開しています。JaneStyle・V2C・Siki等の2ch専ブラから
        以下の板メニューURLを登録すると、スレ一覧の閲覧・書き込みができます。
      </p>
      <section className="bg-panel border border-line rounded-xl p-4 space-y-2">
        <h2 className="font-bold">板メニューURL</h2>
        <code className="block text-xs break-all bg-panel2 rounded p-2">{SITE_URL}/2ch/bbsmenu.json</code>
        <p className="text-xs text-mut">
          旧形式の専ブラは <code>{SITE_URL}/2ch/bbsmenu.html</code> を登録してください。
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-bold">板一覧</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <a className="text-x hover:underline" href="/2ch/people/subject.txt">
              人物板（subject.txt）
            </a>
            {" "}— 各人物のスレ
          </li>
          <li>
            <a className="text-x hover:underline" href="/2ch/polls/subject.txt">
              投票トーク板（subject.txt）
            </a>
          </li>
          <li>
            <a className="text-x hover:underline" href="/2ch/meta/subject.txt">
              管理板（subject.txt）
            </a>
          </li>
        </ul>
      </section>
      <p className="text-xs text-mut">
        書き込みは各スレの read.cgi へのPOST（専ブラの通常の書き込み）に対応しています。
        投稿はブラウザ版と同じく匿名で、ログは保存されません。
      </p>
      <Link href="/" className="text-x hover:underline">
        ← サイトに戻る
      </Link>
    </div>
  );
}
