// 投票トークUI用ヘルパー: 選択肢テキストから関連人物を引き当ててアバターを出す

export type PollPersonLite = { id: string; name: string; avatar_url: string | null };

/** 選択肢テキストと関連人物の名前が一致したらその人物を返す（シードpollは名前完全一致） */
export function findOptionPerson(
  optionText: string,
  related: PollPersonLite[]
): PollPersonLite | null {
  const t = optionText.trim();
  if (!t) return null;
  return related.find((p) => (p.name ?? "").trim() === t) ?? null;
}

/** 48px用の _normal を大きい表示でも綺麗な _400x400 に差し替える */
export function bigAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.includes("_normal") ? url.replace("_normal", "_400x400") : url;
}
