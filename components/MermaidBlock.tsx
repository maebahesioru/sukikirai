"use client";

// Mermaid図の描画（2026-10-12）: ```mermaid コードブロックをSVGに描画する。
// mermaid本体（重い）は図が実際にある時だけ遅延ロードする。
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n-client";

type MermaidApi = {
  initialize: (o: Record<string, unknown>) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

let mermaidPromise: Promise<MermaidApi> | null = null;
let seq = 0;

function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      const mermaid = m.default as unknown as MermaidApi;
      const dark = document.documentElement.classList.contains("dark");
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: dark ? "dark" : "neutral",
        fontFamily: "inherit",
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

export default function MermaidBlock({ code }: { code: string }) {
  const t = useT();
  const [svg, setSvg] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    loadMermaid()
      .then(async (mermaid) => {
        try {
          const { svg } = await mermaid.render(`mmd-${Date.now()}-${seq++}`, code);
          if (alive) setSvg(svg);
        } catch {
          if (alive) setErr(true);
        }
      })
      .catch(() => {
        if (alive) setErr(true);
      });
    return () => {
      alive = false;
    };
  }, [code]);

  if (err) {
    // 構文エラー時はコードブロックのまま表示
    return (
      <pre className="my-2 p-3 rounded-lg bg-panel2 border border-line overflow-x-auto text-xs">
        <code>{code}</code>
      </pre>
    );
  }
  if (!svg) {
    return <div className="text-xs text-mut py-2">{t("図を描画中…")}</div>;
  }
  return (
    <div
      className="my-2 overflow-x-auto mermaid-box"
      // mermaid（securityLevel: strict）が生成したSVGのみを挿入する（ユーザー入力はcodeとして渡るだけでHTMLに入らない）
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
