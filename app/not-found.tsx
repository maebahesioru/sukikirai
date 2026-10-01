import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-6xl font-black text-mut">404</p>
      <p className="text-mut">お探しのページは見つかりませんでした。</p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-x text-white font-bold text-sm hover:opacity-90 transition"
      >
        ホームに戻る
      </Link>
    </div>
  );
}
