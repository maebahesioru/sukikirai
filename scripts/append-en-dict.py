#!/usr/bin/env python3
"""en.json へ追加エントリを追記（変換中に見つかった分）"""
import json

EXTRA = {
    "総選挙": "Grand Election",
    "第1回ツイッタラー総選挙": "The 1st Twitterer Grand Election",
    "あのツイッタラーのこと、": "That Twitterer… ",
    "好き？嫌い？": "Like or Dislike?",
    "X全体のツイッタラーたちの「好き嫌い」と「8項目評価」をみんなで書き込める匿名サイトです。@IDで検索すると未登録のXユーザーもその場で追加できます。": "An anonymous site where everyone can post “like / dislike” and 8-item ratings for X users. Search by @ID to add unregistered users on the spot.",
    "今日のまとめ（{date}）を見る": "See today's digest ({date})",
    "24時間の急上昇": "Risers (last 24h)",
    "もっと見る": "See more",
    "一覧へ": "See all",
    "{n}票": "{n} votes",
    "総合評価ランキング": "Overall Rating Ranking",
    "本サイトは誰でも匿名でXユーザーの好き嫌い・評価を書き込める非公式のまとめサイトです。X Corp. および各対象者とは関係ありません。誹謗中傷・個人情報の投稿は禁止です。": "An unofficial community site where anyone can anonymously post likes/dislikes and ratings for X users. Not affiliated with X Corp. or any listed individual. Defamation and posting personal information are prohibited.",
    "姉妹サイト:": "Sister site:",
    "Twitter馴れ合いサークル（馴れ合い表）": "Twitter Nareai Circle (friendliness chart)",
    "前へ": "Prev",
    "次へ": "Next",
    "コメント（{n}）": "Comments ({n})",
    "このページはアーカイブされたため、コメントの新規投稿はできません": "This page is archived, so new comments can't be posted.",
    "コメントを見るには、まず上の「好き / 嫌い」に投票してください": "Vote Like / Dislike above to see the comments.",
    ">>{n} への返信": "Reply to >>{n}",
    "好き派として投稿": "Post as Liker",
    "嫌い派として投稿": "Post as Disliker",
    "Xでツイートする": "Share on X",
    "返信": "Reply",
    "【{side}】{name}に投票しました！\n【好き派】{like}% vs【嫌い派】{dislike}%\n#ツイッタラー世論調査": "【{side}】Voted on {name}!\n【Likers】{like}% vs【Dislikers】{dislike}%\n#ツイッタラー世論調査",
    "【{side}】{name} のこと好き？嫌い？\n【好き派】{like}% vs【嫌い派】{dislike}%\n#ツイッタラー世論調査": "【{side}】{name} — Like or Dislike?\n【Likers】{like}% vs【Dislikers】{dislike}%\n#ツイッタラー世論調査",
    "【{side}】{name}へのコメントを投稿しました！\n\n「{content}」\n\n#ツイッタラー世論調査": "【{side}】Posted a comment on {name}!\n\n“{content}”\n\n#ツイッタラー世論調査",
    "「{name}」の8項目評価を書き込みました！\n総合 {ov}/5.0\n#ツイッタラー世論調査": "Wrote an 8-item rating for “{name}”!\nOverall {ov}/5.0\n#ツイッタラー世論調査",
    "{name}のことは…好き？嫌い？": "{name} — Like or Dislike?",
    "好き {n}票（{pct}%）": "Like {n} ({pct}%)",
    "嫌い {n}票（{pct}%）": "Dislike {n} ({pct}%)",
    "※ このページはアーカイブされたため、投票は終了しています": "* This page is archived, so voting has ended.",
    "投票すると、みんなのコメントが読めるようになり、8項目評価を書き込めます": "Vote to unlock everyone's comments and write 8-item ratings.",
    "あなたは「": "You voted ",
    "」に投票しました": "",
    "（{n}人が回答）": "({n} ratings)",
    "（{n}）": "({n})",
    "※ このページはアーカイブされたため、評価の書き込みは終了しています": "* This page is archived, so rating has ended.",
    "投票すると評価を書き込めるようになります": "Vote to unlock ratings.",
    "今日の評価は送信済みです（あなたの評価は●で表示）": "Today's rating already submitted (your scores show as ●).",
    "このページはアーカイブされました。": "This page has been archived.",
    "（最終確認: {date}）": "(Last checked: {date})",
    "回答 {n}人": "{n} ratings",
    "好き率 {rank}位 / {total}人": "Like rank #{rank} of {total}",
    "比較する": "Compare",
    "タグ内好感度ランキング": "Like-rate ranking within tag",
    "「{tags}」タグを持つ人物の中での好き率": "Like rate among people tagged “{tags}”",
    "関連人物": "Related people",
    "関連する投票トーク": "Related Poll Talks",
    "面白さ": "Fun",
    "正確さ": "Accuracy",
    "発信力": "Influence",
    "知識・教養": "Knowledge",
    "人間性": "Humanity",
    "カリスマ性": "Charisma",
    "返信・対応": "Replies",
}

path = "lib/i18n/messages/en.json"
d = json.load(open(path, encoding="utf-8"))
before = len(d)
d.update(EXTRA)
json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1, sort_keys=True)
print(f"追加: {len(d) - before} / 合計: {len(d)}")
