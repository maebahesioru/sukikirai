// 掲示板のリッチテキストレンダラ（2026-10-12）
// Markdown（GFM相当）+ 色タグ（<font color>等の2ch互換）+ Mermaid + LaTeX（KaTeX）
// パイプライン: markdown-it → Mermaidブロック抽出 → sanitize-html → （呼び出し側でTwemoji）
import MarkdownIt from "markdown-it";
import katexPlugin from "@vscode/markdown-it-katex";
import sanitizeHtml from "sanitize-html";

const md = new MarkdownIt({
  html: true, // <font color> 等の生HTMLを通す（後段sanitizeで無害化）
  linkify: true, // 素のURLを自動リンク化
  breaks: true, // 改行 = <br>（掲示板流）
  typographer: false,
});

// LaTeX（$...$ / $$...$$）
md.use(katexPlugin as never, { throwOnError: false, errorColor: "#f4212e" });

// >>N アンカー（#cN へのリンク）
md.inline.ruler.before("link", "anchor", (state, silent) => {
  const m = state.src.slice(state.pos).match(/^>>(\d{1,4})/);
  if (!m) return false;
  if (!silent) {
    const t = state.push("html_inline", "", 0);
    t.content = `<a href="#c${m[1]}" class="anchor-link">&gt;&gt;${m[1]}</a>`;
  }
  state.pos += m[0].length;
  return true;
});

// リンクは新規タブ + nofollow
const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet("target", "_blank");
  tokens[idx].attrSet("rel", "noopener noreferrer nofollow");
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// 危険なstyle宣言の除去（katexのstyleは通しつつ、fixed配置等の悪用を防ぐ）
const DANGEROUS_STYLE = /(^|;)\s*(position|z-index|inset|transform|filter|mix-blend-mode|pointer-events|clip|clip-path)\s*:/i;
function cleanStyle(style: string): string {
  const kept = style
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !DANGEROUS_STYLE.test(s));
  return kept.join("; ");
}

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "strong", "em", "del", "s", "b", "i", "u",
    "code", "pre", "blockquote",
    "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "span", "div", "font", "ruby", "rt", "rp", "small", "big", "sup", "sub",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "class"],
    img: ["src", "alt", "class", "loading"],
    font: ["color"],
    span: ["class", "style"],
    div: ["class", "style", "data-mermaid"],
    code: ["class"],
    pre: ["class"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    ol: ["start"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (tag, attrs) => ({
      tagName: "a",
      attribs: { ...attrs, target: "_blank", rel: "noopener noreferrer nofollow" },
    }),
    img: (tag, attrs) => ({ tagName: "img", attribs: { ...attrs, loading: "lazy" } }),
    span: (tag, attrs) => {
      // katexが生成したspan以外からstyleを剥がす
      if (attrs.class && /katex/.test(attrs.class)) {
        if (attrs.style) attrs.style = cleanStyle(attrs.style);
      } else {
        delete attrs.style;
      }
      return { tagName: "span", attribs: attrs };
    },
    div: (tag, attrs) => {
      if (attrs.class && /katex/.test(attrs.class)) {
        if (attrs.style) attrs.style = cleanStyle(attrs.style);
      } else {
        delete attrs.style;
      }
      return { tagName: "div", attribs: attrs };
    },
  },
};

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

export type RichContent = { html: string; mermaid: string[] };

/** Markdown等を安全なHTMLへ。Mermaidコードブロックは抽出して mermaid[] に分離する */
export function renderRich(content: string): RichContent {
  // 行頭の >>N はMarkdownの引用（>）と衝突するため、先にアンカーHTMLへ置換する
  // （コードフェンス内は置換しない）
  let inFence = false;
  const src = content
    .split("\n")
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return line.replace(/^>>(\d{1,4})(?!>)/, (_m, n: string) => {
        return `<a href="#c${n}" class="anchor-link">&gt;&gt;${n}</a>`;
      });
    })
    .join("\n");

  let raw = md.render(src);
  const mermaid: string[] = [];
  raw = raw.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_all, code: string) => {
      mermaid.push(decodeEntities(code));
      return `<div data-mermaid="${mermaid.length - 1}" class="mermaid-slot"></div>`;
    }
  );
  const html = sanitizeHtml(raw, SANITIZE_OPTS);
  return { html, mermaid };
}

/** リッチ機能が使われていそうか（未使用なら素の軽量パスにできる） */
export function looksRich(content: string): boolean {
  return /(\*\*|__|~~|`|^\s*[-*+]\s|^\s*\d+\.\s|^\s*>|^\s*#|\||\$\$?[^\s$]|<font|<b>|<i>|<u>|<ruby|\[[^\]]+\]\(|```|~~)/m.test(
    content
  );
}
