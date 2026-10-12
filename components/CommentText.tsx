"use client";

// コメント本文の表示（2026-10-12 リッチ化）:
// Markdown / 色タグ(<font color>等) / LaTeX(KaTeX) / Mermaid / >>Nアンカー / URL / AA / Twemoji
// パイプライン: lib/richtext（markdown-it→sanitize）→ Twemoji遅延適用 → MermaidはReactコンポーネントで描画
import { useEffect, useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { isAA } from "@/lib/format";
import { looksRich, renderRich } from "@/lib/richtext";
import MermaidBlock from "./MermaidBlock";
import EmojiText from "./EmojiText";
import "katex/dist/katex.min.css";

const BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/";
const HAS_EMOJI = /[\p{Extended_Pictographic}\u20E3]/u;
type TwemojiParser = { parse: (s: string, o: Record<string, unknown>) => string };
let parserPromise: Promise<TwemojiParser> | null = null;
function loadParser(): Promise<TwemojiParser> {
  if (!parserPromise) {
    parserPromise = import("@twemoji/api").then((m) => m.default as unknown as TwemojiParser);
  }
  return parserPromise;
}

// ---- 軽量パス（AA時のみ使用）: URLと>>Nをリンク化しつつReactで描画 ----
const URLCHARS = "A-Za-z0-9\\-._~:\\/?#\\[\\]@!$&'()*+,;=%";
const URL_SRC = `(https?:\\/\\/[${URLCHARS}]+|www\\.[${URLCHARS}]+|(?:[a-z0-9-]+\\.)+(?:co\\.jp|com|net|org|gg|io|me|tv|jp|app|dev|fm|site|xyz)(?:\\/[${URLCHARS}]*)?)`;
const URL_SPLIT = new RegExp(URL_SRC, "gi");
const URL_ONE = new RegExp(`^${URL_SRC}$`, "i");
const TRAIL_RE = /[)\]}>.,;:!?。、）」』】]+$/;

function UrlLink({ raw }: { raw: string }) {
  let url = raw;
  let trail = "";
  const m = url.match(TRAIL_RE);
  if (m && m[0].length < url.length) {
    trail = m[0];
    url = url.slice(0, -trail.length);
  }
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-x hover:underline break-all"
      >
        {url}
      </a>
      {trail}
    </>
  );
}

function renderPlain(content: string): ReactNode[] {
  const out: ReactNode[] = [];
  const urlParts = content.split(URL_SPLIT);
  urlParts.forEach((part, i) => {
    if (!part) return;
    if (URL_ONE.test(part)) {
      out.push(<UrlLink key={`u${i}`} raw={part} />);
      return;
    }
    const subs = part.split(/(>>\d+)/g);
    subs.forEach((q, j) => {
      if (!q) return;
      if (/^>>\d+$/.test(q)) {
        out.push(
          <a key={`a${i}-${j}`} href={`#c${q.slice(2)}`} className="text-x hover:underline">
            {q}
          </a>
        );
      } else {
        out.push(<EmojiText key={`s${i}-${j}`} text={q} />);
      }
    });
  });
  return out;
}

export default function CommentText({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const aa = isAA(content) && !looksRich(content);
  const rich = useMemo(() => (aa ? null : renderRich(content)), [content, aa]);
  const [twemojiHtml, setTwemojiHtml] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // スポイラー開閉・画像クリック拡大（委譲ハンドラ）
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    const spoiler = t.closest(".spoiler");
    if (spoiler) {
      spoiler.classList.toggle("open");
      return;
    }
    const imgLink = t.closest("a.img-link") as HTMLAnchorElement | null;
    if (imgLink) {
      e.preventDefault();
      setLightbox(imgLink.getAttribute("href"));
    }
  };

  // Twemojiはクライアントで遅延適用（絵文字を含む時だけロード）
  useEffect(() => {
    setTwemojiHtml(null);
    if (!rich || !HAS_EMOJI.test(rich.html)) return;
    let alive = true;
    loadParser()
      .then((tw) => {
        if (!alive) return;
        setTwemojiHtml(
          tw.parse(rich.html, { folder: "svg", ext: ".svg", base: BASE, className: "emoji" })
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [rich]);

  if (aa) {
    // 呼び出し側の whitespace-pre-wrap / leading-* はAAでは邪魔なので落とす
    const cleanClass = (className ?? "")
      .replace(/\bwhitespace-pre-wrap\b/g, "")
      .replace(/\bleading-\S+/g, "");
    return (
      <pre
        className={`font-aa whitespace-pre overflow-x-auto text-[13px] leading-[1.2] ${cleanClass}`}
      >
        {renderPlain(content)}
      </pre>
    );
  }

  const html = twemojiHtml ?? rich!.html;
  // MermaidスロットでHTMLを分割し、図はReactコンポーネントとして描画する
  const parts = html.split(/<div[^>]*data-mermaid="(\d+)"[^>]*><\/div>/);
  const out: ReactNode[] = [];
  parts.forEach((seg, i) => {
    if (i % 2 === 1) {
      out.push(<MermaidBlock key={`m${i}`} code={rich!.mermaid[Number(seg)] ?? ""} />);
    } else if (seg) {
      // sanitize-html通過済みHTML（katex/リンク/色タグ等のみ許可）を挿入する
      out.push(<div key={`h${i}`} dangerouslySetInnerHTML={{ __html: seg }} />);
    }
  });
  const cleanClass = (className ?? "").replace(/\bwhitespace-pre-wrap\b/g, "");
  return (
    <div className={`md-body ${cleanClass}`} onClick={onClick}>
      {out}
      {lightbox && (
        <div className="img-lightbox" onClick={() => setLightbox(null)}>
          {/* クリックで開いた画像（srcは sanitize 済みHTML由来 or リンクhref） */}
          <img src={lightbox} alt="" />
        </div>
      )}
    </div>
  );
}
