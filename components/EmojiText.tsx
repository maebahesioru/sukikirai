// Twemoji（Xの絵文字）描画: テキスト内の絵文字をCDNのSVG画像に置換する
import twemoji from "@twemoji/api";

const BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/";
// 絵文字が含まれるかの高速判定（含まれなければReactの通常描画で済ませる）
const HAS_EMOJI = /[\p{Extended_Pictographic}\u20E3]/u;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function EmojiText({ text, className }: { text: string; className?: string }) {
  if (!HAS_EMOJI.test(text)) {
    return <span className={className}>{text}</span>;
  }
  // 安全: 先にHTMLエスケープした文字列へ twemoji.parse が <img> タグのみを挿入する
  // （ユーザー入力がそのままHTMLに入ることはない）
  const html = twemoji.parse(escapeHtml(text), {
    folder: "svg",
    ext: ".svg",
    base: BASE,
    className: "emoji",
  });
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
