import { supabase } from './supabase';

/**
 * コメントの評価数を取得
 */
export async function getCommentReactionCounts(commentIds: string[]) {
  if (commentIds.length === 0) return {};

  const { data: reactions } = await supabase
    .from('comment_reactions')
    .select('comment_id, reaction_type')
    .in('comment_id', commentIds);

  const counts: Record<string, { good: number; bad: number }> = {};

  reactions?.forEach((reaction) => {
    if (!counts[reaction.comment_id]) {
      counts[reaction.comment_id] = { good: 0, bad: 0 };
    }
    if (reaction.reaction_type === 'good') {
      counts[reaction.comment_id].good++;
    } else {
      counts[reaction.comment_id].bad++;
    }
  });

  return counts;
}

/**
 * ユーザーがコメントに評価済みかチェック
 */
export async function getUserCommentReaction(commentId: string, cookieId: string) {
  const { data } = await supabase
    .from('comment_reactions')
    .select('reaction_type')
    .eq('comment_id', commentId)
    .eq('cookie_id', cookieId)
    .single();

  return data?.reaction_type || null;
}

/**
 * コメントに評価を追加/変更
 */
export async function toggleCommentReaction(
  commentId: string,
  reactionType: 'good' | 'bad',
  cookieId: string,
  ipAddress?: string
) {
  // 既存の評価を確認
  const { data: existing } = await supabase
    .from('comment_reactions')
    .select('*')
    .eq('comment_id', commentId)
    .eq('cookie_id', cookieId)
    .single();

  if (existing) {
    if (existing.reaction_type === reactionType) {
      // 同じ評価なら削除（取り消し）
      await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('cookie_id', cookieId);
      return null;
    } else {
      // 違う評価なら更新
      await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('cookie_id', cookieId);
      
      await supabase.from('comment_reactions').insert({
        comment_id: commentId,
        reaction_type: reactionType,
        cookie_id: cookieId,
        ip_address: ipAddress,
      });
      return reactionType;
    }
  } else {
    // 新規評価
    await supabase.from('comment_reactions').insert({
      comment_id: commentId,
      reaction_type: reactionType,
      cookie_id: cookieId,
      ip_address: ipAddress,
    });
    return reactionType;
  }
}
