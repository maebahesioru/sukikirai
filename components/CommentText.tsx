// コメント本文の表示: >>N アンカーをリンク化する
export default function CommentText({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const parts = content.split(/(>>\d+)/g);
  return (
    <p className={className}>
      {parts.map((p, i) =>
        /^>>\d+$/.test(p) ? (
          <a key={i} href={`#c${p.slice(2)}`} className="text-x hover:underline">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </p>
  );
}
