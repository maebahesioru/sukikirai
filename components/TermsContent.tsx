import { SITE_NAME } from "@/lib/site";

export default function TermsContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <h3 className="text-base font-bold">{SITE_NAME} 利用規約</h3>

      <section>
        <h4 className="font-bold mb-1">第1条（適用）</h4>
        <p>
          本規約は、本サービス（{SITE_NAME}
          、以下「本サイト」）の利用に関する条件を定めるものです。ユーザーは、本規約に同意した上で本サイトを利用するものとします。
        </p>
      </section>

      <section>
        <h4 className="font-bold mb-1">第2条（禁止事項）</h4>
        <p>ユーザーは、本サイトの利用にあたり、以下の行為をしてはなりません。</p>
        <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
          <li>法令または公序良俗に違反する行為</li>
          <li>犯罪行為に関連する行為</li>
          <li>他のユーザーまたは第三者の権利を侵害する行為</li>
          <li>誹謗中傷、嫌がらせ、脅迫等の行為</li>
          <li>個人情報（住所・電話番号等）を晒す行為</li>
          <li>本サイトの運営を妨害する行為</li>
          <li>不正アクセス、またはこれを試みる行為</li>
          <li>スパム行為、荒らし行為</li>
          <li>自動化ツール等を使用した不正な投稿</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">第3条（投稿コンテンツ）</h4>
        <p>
          ユーザーが投稿したコメント・評価等のコンテンツに関する責任は、投稿したユーザー自身が負うものとします。運営者は、投稿内容について一切の責任を負いません。
        </p>
      </section>

      <section>
        <h4 className="font-bold mb-1">第4条（コンテンツの削除）</h4>
        <p>
          運営者は、ユーザーが投稿したコンテンツが本規約に違反すると判断した場合、事前の通知なく当該コンテンツを削除・非表示にできるものとします。
        </p>
      </section>

      <section>
        <h4 className="font-bold mb-1">第5条（免責事項）</h4>
        <p>
          本サイトは非公式のまとめサイトであり、X Corp.
          および評価対象の人物・団体とは一切関係ありません。本サイトの利用により生じた損害について、運営者は一切の責任を負いません。
        </p>
      </section>

      <section>
        <h4 className="font-bold mb-1">第6条（利用制限）</h4>
        <p>
          運営者は、本規約に違反したユーザーに対して、事前の通知なく本サイトの利用を制限できるものとします。
        </p>
      </section>

      <section>
        <h4 className="font-bold mb-1">第7条（変更）</h4>
        <p>
          運営者は、必要と判断した場合、ユーザーに通知することなく本規約を変更できるものとします。変更後の規約は本ページに掲載した時点から効力を生じます。
        </p>
      </section>
    </div>
  );
}
