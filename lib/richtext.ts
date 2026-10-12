// 掲示板のリッチテキストレンダラ（2026-10-12）
// Markdown（GFM相当）+ 色タグ（<font color>等の2ch互換）+ Mermaid + LaTeX（KaTeX）
// + @メンション + スポイラー + 画像直リンク + !dice/!omikuji
// パイプライン: 前処理（アンカー/スポイラー/コマンド）→ markdown-it → Mermaid抽出 → 画像展開 → sanitize-html
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
  if (state.linkLevel > 0) return false; // リンク内でのネスト防止
  const m = state.src.slice(state.pos).match(/^>>(\d{1,4})/);
  if (!m) return false;
  if (!silent) {
    const t = state.push("html_inline", "", 0);
    t.content = `<a href="#c${m[1]}" class="anchor-link">&gt;&gt;${m[1]}</a>`;
  }
  state.pos += m[0].length;
  return true;
});

// @メンション → 人物ページへのリンク（メール等の誤爆は文脈で防止）
md.inline.ruler.before("link", "mention", (state, silent) => {
  if (state.linkLevel > 0) return false;
  const prev = state.pos > 0 ? state.src[state.pos - 1] : "";
  if (/[A-Za-z0-9_@]/.test(prev)) return false;
  const m = state.src.slice(state.pos).match(/^@([A-Za-z0-9_]{1,15})(?![A-Za-z0-9_])/);
  if (!m) return false;
  if (!silent) {
    const t = state.push("html_inline", "", 0);
    t.content = `<a href="/person/${m[1]}" class="mention">@${m[1]}</a>`;
  }
  state.pos += m[0].length;
  return true;
});

// リンクは新規タブ + nofollow
const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = String(tokens[idx].attrGet("href") ?? "");
  if (/^https?:/i.test(href)) {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer nofollow");
  }
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
    span: ["class", "style", "role", "tabindex"],
    div: ["class", "style", "data-mermaid"],
    code: ["class"],
    pre: ["class"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    ol: ["start"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (tag, attrs) => {
      // 外部リンクのみ新規タブ + nofollow（>>N・メンション等の内部リンクはそのまま）
      if (/^https?:/i.test(attrs.href ?? "")) {
        return { tagName: "a", attribs: { ...attrs, target: "_blank", rel: "noopener noreferrer nofollow" } };
      }
      return { tagName: "a", attribs: attrs };
    },
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

// ---- 決定的乱数（同一内容→同一結果。SSR/クライアントで一致させる） ----
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** !dice / !omikuji を決定的に処理してHTMLへ（行単位） */
function renderCommand(line: string, seedBase: string, lineIdx: number): string | null {
  const m = line.match(/^\s*!(dice|omikuji)(?:\s+(.*))?$/i);
  if (!m) return null;
  const kind = m[1].toLowerCase();
  const arg = (m[2] ?? "").trim();
  const rng = mulberry32(fnv1a(`${seedBase}|${lineIdx}|${line}`));
  if (kind === "omikuji") {
    const table: [string, number][] = [
      ["大吉", 10], ["中吉", 20], ["小吉", 25], ["吉", 25], ["凶", 15], ["大凶", 5],
    ];
    let r = rng() * 100;
    let fortune = "吉";
    for (const [name, w] of table) {
      if (r < w) { fortune = name; break; }
      r -= w;
    }
    return `<span class="dice-box">🎋 <code>!omikuji</code> → <strong>${fortune}</strong></span>`;
  }
  // dice: "2d6" / "6" / "d100" / 省略時 1d6
  let n = 1;
  let faces = 6;
  if (arg) {
    const dm = arg.match(/^(\d{0,2})d(\d{1,4})$/i) ?? arg.match(/^(\d{1,4})$/);
    if (!dm) return `<span class="dice-box">🎲 <code>!dice ${escapeText(arg)}</code> → 形式エラー（例: !dice 2d6）</span>`;
    if (dm.length === 3 && dm[2] !== undefined) {
      n = dm[1] ? parseInt(dm[1], 10) : 1;
      faces = parseInt(dm[2], 10);
    } else {
      faces = parseInt(dm[1], 10);
    }
  }
  n = Math.min(Math.max(n, 1), 20);
  faces = Math.min(Math.max(faces, 2), 1000);
  const rolls: number[] = [];
  for (let i = 0; i < n; i++) rolls.push(1 + Math.floor(rng() * faces));
  const total = rolls.reduce((a, b) => a + b, 0);
  const detail = n > 1 ? `（${rolls.join(" + ")}）` : "";
  return `<span class="dice-box">🎲 <code>!dice ${n}d${faces}</code> → <strong>${total}</strong>${detail}</span>`;
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---- 画像直リンク判定 ----
function isImageUrl(u: string): boolean {
  if (/^https?:\/\/[^"'\s]+\.(png|jpe?g|gif|webp|avif|bmp)([?#].*)?$/i.test(u)) return true;
  if (/^https?:\/\/pbs\.twimg\.com\/[^"'\s]*[?&]format=(png|jpe?g|gif|webp)/i.test(u)) return true;
  if (/^https?:\/\/(i\.)?gyazo\.com\/[^"'\s]*/i.test(u)) return true;
  if (/^https?:\/\/i\.imgur\.com\/[^"'\s]+/i.test(u)) return true;
  if (/^https?:\/\/i\.pinimg\.com\/[^"'\s]+/i.test(u)) return true;
  if (/^https?:\/\/cdn\.discordapp\.com\/attachments\/[^"'\s]+/i.test(u)) return true;
  return false;
}

export type RichContent = { html: string; mermaid: string[] };

/** Markdown等を安全なHTMLへ。Mermaidコードブロックは抽出して mermaid[] に分離する */
export function renderRich(content: string): RichContent {
  // 前処理（コードフェンス内は対象外）:
  //  - 行頭の >>N（Markdownの引用と衝突するため先にアンカーHTMLへ）
  //  - [spoiler]…[/spoiler]
  //  - !dice / !omikuji
  let inFence = false;
  const src = content
    .split("\n")
    .map((line, idx) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      const cmd = renderCommand(line, content, idx);
      if (cmd) return cmd;
      let out = line.replace(/^>>(\d{1,4})(?!>)/, (_m, n: string) => {
        return `<a href="#c${n}" class="anchor-link">&gt;&gt;${n}</a>`;
      });
      out = out
        .replace(/\[spoiler\]/gi, '<span class="spoiler" role="button" tabindex="0">')
        .replace(/\[\/spoiler\]/gi, "</span>");
      return out;
    })
    .join("\n");

  let raw = md.render(src);

  // Mermaidブロック抽出
  const mermaid: string[] = [];
  raw = raw.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_all, code: string) => {
      mermaid.push(decodeEntities(code));
      return `<div data-mermaid="${mermaid.length - 1}" class="mermaid-slot"></div>`;
    }
  );

  // 画像直リンク → インライン画像（クリック拡大は CommentText 側で処理）
  raw = raw.replace(
    /<a href="([^"]+)"[^>]*>([^<]*)<\/a>/g,
    (all: string, href: string, text: string) => {
      if (!isImageUrl(href)) return all;
      if (text !== href && decodeEntities(text) !== href) return all; // ラベル付きリンクはそのまま
      return `<a href="${href}" class="img-link" target="_blank" rel="noopener noreferrer nofollow"><img src="${href}" alt="" loading="lazy"></a>`;
    }
  );

  const html = sanitizeHtml(raw, SANITIZE_OPTS);
  return { html, mermaid };
}

/** 強いMarkdown/リッチ記法のシグナル（AA判定より優先する。AA誤爆防止のため限定的に） */
export function looksRich(content: string): boolean {
  return /(```|\$\$[^$]+\$\$|\$[^\s$][^$]*\$|\*\*[^*]+\*\*|~~[^~]+~~|<font\b|<ruby\b|\[[^\]]+\]\([^)]+\)|\[spoiler\]|^\s*!(dice|omikuji)\b|^\s*\|[^\n|]*\|[^\n|]*\||^#{1,4}\s)/im.test(
    content
  );
}
