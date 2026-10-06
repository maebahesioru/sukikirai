// 分類ロジックの単体テスト（bunで直接実行）
import { classifyCategory } from "../lib/tag-rules";

const cases: [string, string, string, string][] = [
  // [name, bio, handle, 期待]
  ["ちゃいまに🫪", "", "tea_mania01", "ヒカマー"],
  ["アナ、ゥ", "", "HIKAKIN_Mania", "ヒカマー"],
  ["ぶしめ【么式】", "", "hikakinmaniq", "ヒカマー"],
  ["Annie_PJ", "", "percy_mania", "ヒカマー"],
  ["かるぴーす", "イラスト描いてます", "karupisu", "クリエイター"],
  ["はるくん", "ニコニコ：https://www.nicovideo.jp/user/129223924", "harukun19", "クリエイター"],
  ["テスト", "youtube.com/xxx チャンネル登録よろしく", "test1", "YouTuber"],
  ["テスト", "twitch.tv/xxx で配信中", "test2", "配信者"],
  ["テスト", "pixiv.net/users/1", "test3", "クリエイター"],
  ["テスト", "漫画描いてます", "test4", "クリエイター"],
  ["普通の人", "猫が好き", "neko", "その他"],
  ["使用", "好きな音楽や映画、ドラマの話をしてます", "siyou", "その他"],
  ["まやち", "ニャンコと納豆をこよなく愛する男", "mayachi", "その他"],
  ["テスト", "好き嫌い.comの話", "test5", "その他"],
  ["テスト", "showroomでライバーしてます", "test6", "配信者"],
  ["テスト", "中の人はいません。自動でツイートします", "test7", "BOT"],
  ["テスト", "Live2Dで活動してます", "test8", "Vtuber"],
  ["ソフトバンク", "ソフトバンク公式Xアカウントです。新商品やイベント", "SoftBank", "企業・サービス"],
  ["NOPE", "サントリーのギルティ炭酸NOPEの公式\nアカウントです。欲望のままに", "NOPE_jp", "企業・サービス"],
  ["テスト", "このアカウントは非公式です！ハズビンホテル関係の情報", "HazbinHotel_88", "その他"],
  ["motomachimayuge", "横浜バニラ株式会社 代表取締役社長CEO", "motomachimayuge", "企業・サービス"],
  ["予兆", "予兆の公式Xです！AIや人間の心を読もう！", "YochoKoshiki", "企業・サービス"],
  ["テスト", "note.com/xxx で執筆しています", "test9", "クリエイター"],
  ["テスト", "ブログやってます", "test10", "クリエイター"],
  ["テスト", "ヒカニチ見てます", "test11", "ヒカマー"],
  ["テスト", "市議をしています", "test12", "政治家"],
  ["テスト", "YouTubeチャンネルやってます", "test13", "YouTuber"],
  ["テスト", "UUUM所属です", "test14", "YouTuber"],
];

let ng = 0;
for (const [name, bio, handle, want] of cases) {
  const got = classifyCategory(name, bio, false, handle);
  const ok = got === want;
  if (!ok) ng++;
  console.log(`${ok ? "OK " : "NG "} ${name.slice(0, 12)} → ${got}${ok ? "" : ` (期待: ${want})`}`);
}
console.log(ng === 0 ? "\n全テスト合格" : `\n${ng}件NG`);
