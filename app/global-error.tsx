"use client";

// ルートレイアウト自体が落ちた場合の最終フォールバック（2026-10-14）
// プロバイダー外なのでテーマ変数は使えず、静的スタイルで描画する
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  void error;
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#16181c",
          color: "#e7e9ea",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "18vh 16px 0", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🛠️</div>
          <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>一時的なエラーが発生しました</h2>
          <p style={{ fontSize: 14, color: "#8b98a5", lineHeight: 1.7, margin: "0 0 18px" }}>
            ページの読み込み中に問題が起きました。多くの場合、再読み込みで解決します。
          </p>
          <button
            onClick={() => location.reload()}
            style={{
              background: "#1d9bf0",
              color: "#fff",
              border: 0,
              borderRadius: 10,
              padding: "10px 22px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            再読み込み
          </button>
          <p style={{ fontSize: 11, color: "#8b98a5", marginTop: 14 }}>
            A temporary error occurred. Reloading usually fixes it.
          </p>
        </div>
      </body>
    </html>
  );
}
