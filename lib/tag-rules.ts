// タグ自動付与（キーワード辞書 + プロフ単語の自動昇格・LLM/外部API不使用の純ローカル判定）
//
// 2層構造:
//   1) 辞書（TAG_RULES） — キュレーション済みの主要タグ
//   2) 自動昇格タグ   — プロフ文を単語分割し、2人以上が使っている語を自動でタグ化（プロフの多様さに比例して増える）
//
// 命名方針: 「◯◯マー」はヒカマー系の称号のみ。自動昇格タグは語そのまま（一般ユーザーにも自然）。

export type TagRule = {
  tag: string;
  /** どれか1つ含まれていればヒット（NFKC+小文字化して照合） */
  keywords: string[];
  /** このキーワードが本文にあればこのルールは適用しない */
  unless?: string[];
  /** ヒカマー（成人ヒカマー含む）と判定された人にのみ付与 */
  hikamerOnly?: boolean;
};

export type PromotedTag = { tag: string; count: number };

/** ヒカマー界隈の命名規則（名前で判定） */
const HIKAMER_NAME_RE = /mani|マニ|キン$|bot$/i;

/** 成人向けシグナル（成人ヒカマー判定に使用） */
const ADULT_RE = /r18|r-18|18\+|18禁|成人向け|エロ|えっち|えちえち|ぴんく|nsfw|fanbox|fantia|アダルト/;

/** 反ヒカマー系（ヒカマー判定より先に処理） */
const ANTI_HIKAMER_RE = /ヒカマーアンチ|反ヒカマー|ヒカマニアンチ|ヒカマー嫌い|アンチヒカマー/;

/** ヒカマー本体シグナル */
const HIKAMER_RE = /ヒカマー|ヒカマニ|ヒカマズ|ヒカマー界隈|ヒカマる/;

/**
 * 専門タグ辞書（上から順に判定・最大3個まで）。
 * 追加したいときは { tag: "◯◯好き", keywords: ["◯◯"] } を足すだけ。
 */
export const TAG_RULES: TagRule[] = [
  // --- サブカル・コンテンツ ---
  { tag: "ブルアカ好き", keywords: ["ブルアカ", "ブルーアーカイブ", "キヴォトス", "シャーレ"] },
  { tag: "淫夢好き", keywords: ["淫夢", "やじゅう", "野獣先輩", "真夏の夜", "yaju"] },
  { tag: "音MAD好き", keywords: ["音mad", "音mader", "mad職人"] },
  { tag: "音ゲー好き", keywords: ["音ゲー", "プロセカ", "プロジェクトセカイ", "maimai", "チュウニ", "chunithm", "ビートマニア", "beatmania", "bemani", "osu", "太鼓の達人", "オンゲキ", "ポップン", "ddr"] },
  { tag: "アイマス好き", keywords: ["アイマス", "デレマス", "ミリオンライブ", "シャニマス", "学園アイドルマスター", "765プロ"] },
  { tag: "ラブライブ好き", keywords: ["ラブライブ"] },
  { tag: "バンドリ好き", keywords: ["バンドリ", "bang dream"] },
  { tag: "ぼざろ好き", keywords: ["ぼざろ", "ぼっち・ざ・ろっく", "結束バンド"] },
  { tag: "東方好き", keywords: ["東方", "touhou"] },
  { tag: "特撮好き", keywords: ["仮面ライダー", "ウルトラマン", "スーパー戦隊", "戦隊"] },

  // --- ゲーム ---
  { tag: "ポケモン好き", keywords: ["ポケモン", "ポケカ"] },
  { tag: "スプラ好き", keywords: ["スプラ", "スプラトゥーン"] },
  { tag: "マイクラ好き", keywords: ["マイクラ", "minecraft"] },
  { tag: "エペ好き", keywords: ["エーペックス", "apex", "エペ"] },
  { tag: "ヴァロ好き", keywords: ["ヴァロラント", "ヴァロ", "バロラント", "valorant"] },
  { tag: "原神好き", keywords: ["原神", "genshin"] },
  { tag: "スタレ好き", keywords: ["スターレイル", "スタレ"] },
  { tag: "ゼンゼロ好き", keywords: ["ゼンゼロ", "ゼンレスゾーン", "zzz"] },
  { tag: "フォトナ好き", keywords: ["フォートナイト", "フォトナ"] },
  { tag: "Vtuber好き", keywords: ["vtuber", "ぶいちゅ", "にじさんじ", "ホロライブ", "ホロメン"] },
  { tag: "アークナイツ好き", keywords: ["アークナイツ"] },
  { tag: "ウマ娘好き", keywords: ["ウマ娘"] },
  { tag: "スマブラ好き", keywords: ["スマブラ", "大乱闘"] },
  { tag: "ドラクエ好き", keywords: ["ドラクエ", "ドラゴンクエスト"] },
  { tag: "モンハン好き", keywords: ["モンハン", "モンスターハンター"] },
  { tag: "トレカ好き", keywords: ["トレカ", "カードショップ", "遊戯王", "デュエマ", "カードゲーム"] },

  // --- 趣味・生活 ---
  { tag: "鉄道好き", keywords: ["鉄道", "撮り鉄", "乗り鉄", "鉄オタ", "18きっぷ"] },
  { tag: "バイク好き", keywords: ["バイク", "ツーリング", "リターンライダー"] },
  { tag: "VRChat好き", keywords: ["vrc", "vrchat", "vrsns"] },
  { tag: "野球好き", keywords: ["野球", "プロ野球", "高校野球", "甲子園"] },
  { tag: "サッカー好き", keywords: ["サッカー", "フットボール", "jリーグ", "ワールドカップ", "プレミアリーグ"] },
  { tag: "競馬好き", keywords: ["競馬", "馬券", "一口馬主"] },
  { tag: "麻雀好き", keywords: ["麻雀", "雀魂", "mリーグ"] },
  { tag: "パチスロ好き", keywords: ["パチンコ", "パチスロ", "スロット", "スロカス"] },
  { tag: "カラオケ好き", keywords: ["カラオケ", "joysound", "dam"] },

  // --- 音楽・制作 ---
  { tag: "ギタリスト", keywords: ["ギター", "弾いてみた", "エレキ"] },
  { tag: "ベーシスト", keywords: ["ベース", "ベーシスト"] },
  { tag: "ドラマー", keywords: ["ドラム"] },
  { tag: "ピアニスト", keywords: ["ピアノ", "弾き語り"] },
  { tag: "DTM", keywords: ["dtm", "作曲", "ボカロ", "vocaloid", "初音ミク", "打ち込み"] },
  { tag: "歌い手", keywords: ["歌い手", "歌ってみた", "うたってみた", "歌うま"] },
  { tag: "AIイラスト", keywords: ["aiイラスト", "ai絵", "aiart", "ai art"] },
  { tag: "イラスト", keywords: ["イラスト", "絵描き", "絵師", "お絵描き", "お絵かき", "落書き", "絵を描く"], unless: ["aiイラスト", "ai絵", "aiart", "ai art"] },

  // --- 属性・その他 ---
  { tag: "配信者", keywords: ["配信", "実況", "生放送"] },
  { tag: "技術系ヒカマー", hikamerOnly: true, keywords: ["プログラミ", "プログラマ", "エンジニア", "情報系", "電子工作", "ガジェット", "python", "javascript", "typescript", "rust", "unity", "blender", "3dcg", "セキュリティ"] },
  { tag: "数学", keywords: ["数学"] },
  { tag: "右翼", keywords: ["右翼", "保守", "愛国"] },
  { tag: "左翼", keywords: ["左翼", "リベラル", "サヨク"] },
  { tag: "反ネトウヨ", keywords: ["反ネトウヨ", "ネトウヨ嫌い"] },
  { tag: "いいね職人", keywords: ["いいねの数", "いいね数"] },
  { tag: "タグ荒らし", keywords: ["タグ荒らし"] },
  { tag: "おぜう派", keywords: ["おぜう"] },
];

/** ルールベースでタグを決める（順序: 反ヒカマー → 成人/ヒカマー → 専門タグ・最大3個） */
export function classifyByRules(name: string, bio: string): string[] {
  const n = (name || "").normalize("NFKC");
  const text = `${n}\n${bio || ""}`.normalize("NFKC").toLowerCase();

  // 反ヒカマー（ヒカマー本体判定より先）
  if (ANTI_HIKAMER_RE.test(text)) return ["反ヒカマー"];

  const tags: string[] = [];
  const isHikamer = HIKAMER_RE.test(text) || HIKAMER_NAME_RE.test(n);
  if (isHikamer) {
    tags.push(ADULT_RE.test(text) ? "成人ヒカマー" : "ヒカマー");
  }

  for (const rule of TAG_RULES) {
    if (tags.length >= 3) break;
    if (tags.includes(rule.tag)) continue;
    if (rule.hikamerOnly && !isHikamer) continue;
    if (rule.unless?.some((u) => text.includes(u))) continue;
    if (rule.keywords.some((k) => text.includes(k))) {
      tags.push(rule.tag);
    }
  }
  return tags;
}

/* ================= プロフ単語の自動昇格 ================= */

/** 分割後にタグにしない一般語（小文字で照合） */
const STOPWORDS = new Set<string>([
  // 助詞・助動詞・補助語
  "と", "が", "を", "に", "で", "も", "や", "は", "の", "へ", "ね", "よ", "だ", "な", "て", "た",
  "です", "ます", "ました", "ません", "して", "してる", "してます", "いる", "ある", "なる", "する",
  "やる", "やっ", "やり", "れる", "られ", "たい", "ない", "から", "まで", "より", "ほど", "くらい", "ぐらい",
  "など", "とか", "ので", "のに", "けど", "けれど", "でも", "しか", "だけ", "ばかり", "こそ", "って", "たり",
  "たら", "なら", "こと", "もの", "とき", "ところ", "ため", "よう", "そう", "どう", "こんな", "そんな", "あんな",
  "この", "その", "あの", "ここ", "そこ", "あそこ", "わたし", "私", "僕", "俺", "自分", "みんな", "皆",
  // 汎用語
  "さん", "ちゃん", "くん", "氏", "様", "アカウント", "垢", "ツイート", "フォロー", "フォロバ", "フォロワー",
  "リプ", "リプライ", "dm", "プロフィール", "固定", "ツイフィ", "メイン", "サブ", "本垢", "鍵垢", "裏垢", "活動",
  "情報", "趣味", "日常", "雑多", "記録", "中心", "多め", "気軽", "仲良く", "ください", "下さい", "よろしく",
  "お願い", "感じ", "方", "人", "名", "界隈", "学生", "高校生", "中学生", "大学生", "社会人", "済み", "無言",
  "相互", "ブロック", "解除", "挨拶", "報告", "告知", "宣伝", "更新", "投稿", "好き", "嫌い", "エロ", "えっち",
  "エッチ", "えちえち", "nsfw", "自分用", "系", "派", "者", "部", "会", "屋", "趣味垢", "サブ垢",
  "全て", "基本", "基本的", "名前", "相方", "相棒", "アイコン", "ヘッダー", "推し", "日本", "大好き", "毎日",
  "今日", "明日", "昨日", "今年", "去年", "来年", "場合", "時間", "今回", "以上", "以下", "一応", "失礼",
  "参照", "返し", "関わり", "関わる", "決まっ", "言うまでも", "欲しい", "ほしい", "めっちゃ", "とても",
  "ちょっと", "すごく", "すごい", "やばい", "すぎ", "頻度", "バック", "どうぞ", "ぜひ", "是非",
  "url", "プロフ", "仕事", "アカウント名", "教えて", "見てる", "してます", "しました", "おります",
  "ポスト", "ツイ", "ナイ", "アイコ", "運営", "全員", "以外", "色々", "浮上", "スパム", "避難", "集め",
  "生き", "目標", "面白", "受け付け", "web", "ナイス", "スト", "ンド", "ント",
  "無差別", "お前", "泣き", "時に", "追加", "質問", "メンション", "発信", "支持", "いろいろ", "歓迎",
  "自我", "グル", "中身", "達人", "凍結", "人間", "神様", "定期的", "最近", "わかる", "らしい",
  "ハマ", "荒らす", "通す", "自認", "引退", "複数", "予定", "最悪", "世代", "ミュート", "成人", "垢変", "本物",
  // カタカナ一般語
  "ツイッター", "インスタ", "インスタグラム", "ユーチューブ", "ツイッチ", "ディスコード", "ティックトック",
  "コミュニティ", "コンテンツ", "チャンネル", "サブスク", "リンク", "サイト", "ブログ", "アプリ", "ゲーム", "マー",
  // ラテン一般語
  "the", "and", "for", "you", "with", "my", "me", "our", "your", "his", "her", "its", "at", "to", "of", "in",
  "on", "is", "are", "was", "were", "be", "been", "it", "this", "that", "these", "those", "from", "by", "or",
  "not", "but", "all", "can", "will", "just", "follow", "followers", "following", "thanks", "thank", "please",
  "official", "account", "bot", "via", "https", "http", "www", "com", "net", "org", "t", "amp", "link", "links",
  "bio", "profile", "sns", "youtube", "twitter", "instagram", "tiktok", "twitch", "discord", "facebook",
  "line", "note", "ameblo", "tumblr", "reddit", "pixiv",
]);

/** 自動昇格から除外する語（辞書のキーワード・ヒカマー系の別名） */
const PROMOTION_EXCLUDE = new Set<string>([
  ...TAG_RULES.flatMap((r) => r.keywords.map((k) => k.toLowerCase())),
  "ヒカマー", "ヒカマニ", "ヒカマズ", "ヒカマる", "ヒカマー界隈", "ヒカ", "ヒカマ", "カマ", "カマー", "mania", "mani", "マニ", "マニア", "キン",
]);

let segmenter: Intl.Segmenter | null | undefined;
function getSegmenter(): Intl.Segmenter | null {
  if (segmenter === undefined) {
    try {
      segmenter = new Intl.Segmenter("ja", { granularity: "word" });
    } catch {
      segmenter = null;
    }
  }
  return segmenter;
}

const URL_OR_HANDLE_RE = /https?:\/\/\S+|t\.co\/\S+|@[A-Za-z0-9_]+/g;
const LATIN_RE = /^[A-Za-z0-9]+$/;
const CONTENT_CHAR_RE = /[ぁ-んァ-ヶ一-龠a-zA-Z]/;
const NUMERIC_RE = /^[0-9０-９]+$/;

/** 語尾が動詞・助動詞・形容詞系の候補はタグにしない（「決まってる」「色んな」「低い」等の断片対策） */
const BAD_END_RE =
  /(てる|ってる|でる|ける|げる|べる|める|せる|れる|られる|して|する|した|します|ません|ました|です|ます|たい|かも|かな|けど|ので|のに|から|まで|だけ|しか|れば|たら|なら|くれ|なり|そう|よう|こと|もの|て|い|な|る|う|っ|ん)$/;

/** 結合してよい断片（純カナ/漢字・各2文字以上。「ブル」+「アカ」→「ブルアカ」） */
const MERGEABLE_RE = /^[ァ-ヶー一-龠々]+$/;

/**
 * プロフ文 → タグ候補の語リスト。
 * - URL・@IDを除去 → Intl.Segmenter で単語分割
 * - 助詞等のストップワードで区切りつつ、隣接する内容語を結合（「ブル」+「アカ」→「ブルアカ」）
 * - ラテン語は3文字以上・日本語は2〜12文字
 */
export function bioToCandidates(bio: string): string[] {
  if (!bio) return [];
  const seg = getSegmenter();
  if (!seg) return [];
  const cleaned = bio.normalize("NFKC").replace(URL_OR_HANDLE_RE, " ");
  const tokens: string[] = [];
  let run: string[] = [];

  const okCandidate = (t: string): boolean => {
    if (t.length < 2 || t.length > 12) return false;
    if (LATIN_RE.test(t) && t.length < 3) return false;
    if (STOPWORDS.has(t.toLowerCase())) return false;
    if (/^[ぁ-んー]{1,3}$/.test(t)) return false; // 「なり」「くれ」などの短い助詞的語
    if (BAD_END_RE.test(t)) return false; // 動詞・助動詞の断片
    return true;
  };

  const flush = () => {
    if (run.length === 0) return;
    // 「ブル」+「アカ」のような分割複合語だけ結合（純カナ/漢字・各2文字以上）
    // それ以外の断片は個別にフィルタにかける
    let buf = "";
    const pushBuf = () => {
      if (buf && okCandidate(buf)) tokens.push(buf);
      buf = "";
    };
    for (const t of run) {
      // 2文字以上、または直前の断片に足せる単体カナ（「ヒカマ」+「ー」→「ヒカマー」、「アイコ」+「ン」）
      if (MERGEABLE_RE.test(t) && (t.length >= 2 || (buf !== "" && /^[ァ-ヶー]$/.test(t)))) {
        buf += t;
      } else {
        pushBuf();
        if (okCandidate(t)) tokens.push(t);
      }
    }
    pushBuf();
    run = [];
  };

  for (const part of seg.segment(cleaned)) {
    const raw = part.segment.trim();
    if (!raw) {
      flush();
      continue;
    }
    const norm = raw.toLowerCase();
    const isContent =
      part.isWordLike &&
      CONTENT_CHAR_RE.test(raw) &&
      !NUMERIC_RE.test(raw) &&
      !STOPWORDS.has(norm);
    if (!isContent) {
      flush();
      continue;
    }
    run.push(raw);
  }
  flush();
  return tokens;
}

/**
 * 全員のプロフから、2人以上が使っている語を昇格タグとして集計。
 * 辞書キーワード・ストップワードは除外。表示形はオリジナル（ラテンは先頭大文字）。
 */
export function computePromotedTags(bios: string[]): Map<string, PromotedTag> {
  const counts = new Map<string, number>();
  const display = new Map<string, string>();
  for (const bio of bios) {
    const seen = new Set<string>();
    for (const t of bioToCandidates(bio)) {
      const key = t.toLowerCase();
      if (seen.has(key) || PROMOTION_EXCLUDE.has(key)) continue;
      seen.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!display.has(key)) {
        display.set(key, LATIN_RE.test(t) ? t[0].toUpperCase() + t.slice(1) : t);
      }
    }
  }
  const out = new Map<string, PromotedTag>();
  for (const [key, count] of counts) {
    if (count >= 2) out.set(key, { tag: display.get(key)!, count });
  }
  return out;
}

/** 辞書タグ → 不足分を自動昇格タグで補充（最大3個） */
export function classifyWithAuto(
  name: string,
  bio: string,
  promoted: Map<string, PromotedTag> | null
): string[] {
  const tags = classifyByRules(name, bio);
  if (!promoted || promoted.size === 0 || tags.length >= 3) return tags;
  const extra: PromotedTag[] = [];
  const seen = new Set(tags);
  for (const t of bioToCandidates(bio)) {
    const p = promoted.get(t.toLowerCase());
    if (p && !seen.has(p.tag)) {
      seen.add(p.tag);
      extra.push(p);
    }
  }
  extra.sort((a, b) => b.count - a.count);
  for (const e of extra) {
    if (tags.length >= 3) break;
    tags.push(e.tag);
  }
  return tags;
}
