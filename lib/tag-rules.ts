// タグ自動付与（キーワード辞書方式・LLM/外部API不使用の純ローカル判定）
// プロフィール文と名前からキーワードを照合してタグを決める。辞書はここを編集するだけで全員に反映される。

export type TagRule = {
  tag: string;
  /** どれか1つ含まれていればヒット（小文字化して照合） */
  keywords: string[];
  /** このキーワードが本文にあればこのルールは適用しない */
  unless?: string[];
};

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
 * 追加したいときは { tag: "◯◯マー", keywords: ["◯◯"] } を足すだけ。
 */
export const TAG_RULES: TagRule[] = [
  // --- サブカル・コンテンツ ---
  { tag: "ブルアカマー", keywords: ["ブルアカ", "ブルーアーカイブ", "キヴォトス", "シャーレ"] },
  { tag: "淫夢マー", keywords: ["淫夢", "やじゅう", "野獣先輩", "真夏の夜", "yaju"] },
  { tag: "音MADマー", keywords: ["音mad", "音mader", "mad職人"] },
  { tag: "音ゲーマー", keywords: ["音ゲー", "プロセカ", "プロジェクトセカイ", "maimai", "チュウニ", "chunithm", "ビートマニア", "beatmania", "bemani", "osu", "太鼓の達人", "オンゲキ", "ポップン", "ddr"] },
  { tag: "アイマスマー", keywords: ["アイマス", "デレマス", "ミリオンライブ", "シャニマス", "学園アイドルマスター", "765プロ"] },
  { tag: "ラブライブマー", keywords: ["ラブライブ"] },
  { tag: "バンドリマー", keywords: ["バンドリ", "bang dream"] },
  { tag: "ぼざろマー", keywords: ["ぼざろ", "ぼっち・ざ・ろっく", "結束バンド"] },
  { tag: "東方マー", keywords: ["東方", "touhou"] },
  { tag: "特撮マー", keywords: ["仮面ライダー", "ウルトラマン", "スーパー戦隊", "戦隊"] },

  // --- ゲーム ---
  { tag: "ポケモンマー", keywords: ["ポケモン", "ポケカ"] },
  { tag: "スプラマー", keywords: ["スプラ", "スプラトゥーン"] },
  { tag: "マイクラマー", keywords: ["マイクラ", "minecraft"] },
  { tag: "エペマー", keywords: ["エーペックス", "apex", "エペ"] },
  { tag: "バロラントマー", keywords: ["ヴァロラント", "ヴァロ", "バロラント", "valorant"] },
  { tag: "原神マー", keywords: ["原神", "genshin"] },
  { tag: "スタレマー", keywords: ["スターレイル", "スタレ"] },
  { tag: "ゼンゼロマー", keywords: ["ゼンゼロ", "ゼンレスゾーン", "zzz"] },
  { tag: "フォトナマー", keywords: ["フォートナイト", "フォトナ"] },
  { tag: "vtuberマー", keywords: ["vtuber", "ぶいちゅ", "にじさんじ", "ホロライブ", "ホロメン"] },
  { tag: "アークナイツマー", keywords: ["アークナイツ"] },
  { tag: "ウマ娘マー", keywords: ["ウマ娘"] },
  { tag: "スマブラマー", keywords: ["スマブラ", "大乱闘"] },
  { tag: "ドラクエマー", keywords: ["ドラクエ", "ドラゴンクエスト"] },
  { tag: "モンハンマー", keywords: ["モンハン", "モンスターハンター"] },
  { tag: "トレカマー", keywords: ["トレカ", "カードショップ", "遊戯王", "デュエマ", "カードゲーム"] },

  // --- 趣味・生活 ---
  { tag: "鉄道マー", keywords: ["鉄道", "撮り鉄", "乗り鉄", "鉄オタ", "18きっぷ"] },
  { tag: "バイクマー", keywords: ["バイク", "ツーリング", "リターンライダー"] },
  { tag: "vrcマー", keywords: ["vrc", "vrchat", "vrsns"] },
  { tag: "野球マー", keywords: ["野球", "プロ野球", "高校野球", "甲子園"] },
  { tag: "サッカーマー", keywords: ["サッカー", "フットボール", "jリーグ", "ワールドカップ", "プレミアリーグ"] },
  { tag: "競馬マー", keywords: ["競馬", "馬券", "一口馬主"] },
  { tag: "麻雀マー", keywords: ["麻雀", "雀魂", "mリーグ"] },
  { tag: "パチスロマー", keywords: ["パチンコ", "パチスロ", "スロット", "スロカス"] },
  { tag: "カラオケマー", keywords: ["カラオケ", "joysound", "dam"] },

  // --- 音楽・制作 ---
  { tag: "ギターマー", keywords: ["ギター", "弾いてみた", "エレキ"] },
  { tag: "ベースマー", keywords: ["ベース", "ベーシスト"] },
  { tag: "ドラムマー", keywords: ["ドラム"] },
  { tag: "ピアノマー", keywords: ["ピアノ", "弾き語り"] },
  { tag: "DTMマー", keywords: ["dtm", "作曲", "ボカロ", "vocaloid", "初音ミク", "打ち込み"] },
  { tag: "歌い手マー", keywords: ["歌い手", "歌ってみた", "うたってみた", "歌うま"] },
  { tag: "AIイラストマー", keywords: ["aiイラスト", "ai絵", "aiart", "ai art"] },
  { tag: "イラストマー", keywords: ["イラスト", "絵描き", "絵師", "お絵描き", "お絵かき", "落書き", "絵を描く"], unless: ["aiイラスト", "ai絵", "aiart", "ai art"] },

  // --- 属性・その他 ---
  { tag: "配信マー", keywords: ["配信", "実況", "生放送"] },
  { tag: "技術系ヒカマー", keywords: ["プログラミ", "プログラマ", "エンジニア", "情報系", "電子工作", "ガジェット", "python", "javascript", "typescript", "rust", "unity", "blender", "3dcg", "セキュリティ"] },
  { tag: "数学マー", keywords: ["数学"] },
  { tag: "右翼マー", keywords: ["右翼", "保守", "愛国"] },
  { tag: "左翼マー", keywords: ["左翼", "リベラル", "サヨク"] },
  { tag: "反ネトウヨ", keywords: ["反ネトウヨ", "ネトウヨ嫌い"] },
  { tag: "いいねマー", keywords: ["いいねの数", "いいね数"] },
  { tag: "タグ荒らしマー", keywords: ["タグ荒らし"] },
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
    if (rule.unless?.some((u) => text.includes(u))) continue;
    if (rule.keywords.some((k) => text.includes(k))) {
      tags.push(rule.tag);
    }
  }
  return tags;
}
