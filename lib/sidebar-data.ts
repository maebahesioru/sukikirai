import { supabase } from './supabase';
import { Person } from '@/types/person';
import peopleData from '@/data/people.json';

export type TrendingPerson = Person & {
  voteCount: number;
};

export type CommentWithPerson = {
  id: string;
  person_id: string;
  comment_number: number;
  name: string | null;
  user_id: string | null;
  vote_type: 'like' | 'dislike';
  content: string;
  created_at: string;
  good_count: number;
  bad_count: number;
  is_hidden: boolean;
  is_reported: boolean;
  parent_comment_id: string | null;
  personName: string;
};

/**
 * サイドバー用のデータを取得
 */
export async function getSidebarData() {
  // 過去7日間の投票を集計してトレンド人物を取得
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentVotes } = await supabase
    .from('votes')
    .select('person_id')
    .gte('created_at', sevenDaysAgo.toISOString());

  // 投票数を集計
  const voteCounts = new Map<string, number>();
  recentVotes?.forEach((vote) => {
    voteCounts.set(vote.person_id, (voteCounts.get(vote.person_id) || 0) + 1);
  });

  // トレンド人物リストを作成
  const trendingPeople: TrendingPerson[] = (peopleData as Person[])
    .map((person) => ({
      ...person,
      voteCount: voteCounts.get(person.id) || 0,
    }))
    .filter((p) => p.voteCount > 0)
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, 20);

  // 新着コメントを取得
  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('is_hidden', false)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: false })
    .limit(5);

  const latestComments: CommentWithPerson[] = comments?.map((comment) => {
    const person = (peopleData as Person[]).find((p) => p.id === comment.person_id);
    return {
      ...comment,
      personName: person?.name || '不明',
    };
  }) || [];

  return {
    trendingPeople,
    latestComments,
  };
}
