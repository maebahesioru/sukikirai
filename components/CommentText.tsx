// コメント本文の表示: >>N アンカーをリンク化し、AA（アスキーアート）は等幅で表示する
import { isAA } from "@/lib/format";

export default function CommentText({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const parts = content.split(/(>>\d+)/g);
  const inner = parts.map((p, i) =>
    /^>>\d+$/.test(p) ? (
      <a key={i} href={`#c${p.slice(2)}`} className="text-x hover:underline">
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    )
  );
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
