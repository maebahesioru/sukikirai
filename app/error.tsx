"use client";

// セグメント内の実行時エラー（デプロイ切替瞬間・一時障害など）をフレンドリーに表示（2026-10-14）
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-lg mx-auto my-16 px-4">
      <div className="bg-panel border border-line rounded-2xl p-6 text-center">
        <div className="text-3xl mb-3">🛠️</div>
        <h2 className="text-lg font-bold">一時的なエラーが発生しました</h2>
        <p className="text-sm text-mut mt-2 leading-relaxed">
          ページの読み込み中に問題が起きました。多くの場合、再読み込みで解決します。
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-lg bg-x text-white text-sm font-bold hover:opacity-90 transition"
          >
            再読み込み
          </button>
          <a
            href="/"
            className="px-4 py-2 rounded-lg bg-panel2 border border-line text-sm hover:text-x transition"
          >
            ホームへ戻る
          </a>
        </div>
        <p className="text-[11px] text-mut mt-3">
          A temporary error occurred. Reloading usually fixes it.
        </p>
      </div>
    </div>
  );
}
