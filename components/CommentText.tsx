// コメント本文の表示: >>N アンカーとURLをリンク化し、AA（アスキーアート）は等幅で表示する
import type { ReactNode } from "react";
import { isAA } from "@/lib/format";

// https://… / www.… / 素のドメイン（note.com/xxx 等）をリンク化
// URL本体はASCII URL文字のみ（日本語や「。」を巻き込まない）
const URLCHARS = "A-Za-z0-9\\-._~:\\/?#\\[\\]@!$&'()*+,;=%";
const URL_SRC = `(https?:\\/\\/[${URLCHARS}]+|www\\.[${URLCHARS}]+|(?:[a-z0-9-]+\\.)+(?:co\\.jp|com|net|org|gg|io|me|tv|jp|app|dev|fm|site|xyz)(?:\\/[${URLCHARS}]*)?)`;
const URL_SPLIT = new RegExp(URL_SRC, "gi");
const URL_ONE = new RegExp(`^${URL_SRC}$`, "i");
// URL末尾に付きがちな句読点・閉じ括弧はリンクから外す
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

function renderContent(content: string): ReactNode[] {
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
        out.push(<span key={`s${i}-${j}`}>{q}</span>);
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
  const inner = renderContent(content);
  if (isAA(content)) {
    // 呼び出し側の whitespace-pre-wrap / leading-* はAAでは邪魔なので落とす
    const cleanClass = (className ?? "")
      .replace(/\bwhitespace-pre-wrap\b/g, "")
      .replace(/\bleading-\S+/g, "");
    return (
      <pre
        className={`font-aa whitespace-pre overflow-x-auto text-[13px] leading-[1.2] ${cleanClass}`}
      >
        {inner}
      </pre>
    );
  }
  return <p className={className}>{inner}</p>;
}
