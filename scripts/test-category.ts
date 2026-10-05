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
];

let ng = 0;
for (const [name, bio, handle, want] of cases) {
  const got = classifyCategory(name, bio, false, handle);
  const ok = got === want;
  if (!ok) ng++;
  console.log(`${ok ? "OK " : "NG "} ${name.slice(0, 12)} → ${got}${ok ? "" : ` (期待: ${want})`}`);
}
console.log(ng === 0 ? "\n全テスト合格" : `\n${ng}件NG`);
