import { supabase } from './supabase';
import { Person } from '@/types/person';
import peopleData from '@/data/people.json';

export type RankingPerson = Person & {
  likeCount: number;
  dislikeCount: number;
  totalVotes: number;
  likePercentage: number;
  latestComment?: {
    content: string;
    name: string;
    createdAt: string;
    voteType?: 'like' | 'dislike';
  };
};

const RANKING_LIMIT = 50;

export async function getPopularityRanking(): Promise<RankingPerson[]> {
  const people = peopleData as Person[];
  
  // 全投票を一度に取得
  const { data: allVotes } = await supabase
    .from('votes')
    .select('person_id, vote_type');

  // 全コメントを一度に取得
  const { data: allComments } = await supabase
    .from('comments')
    .select('person_id, content, name, created_at, vote_type')
    .eq('is_hidden', false)
    .eq('vote_type', 'like')
    .order('created_at', { ascending: false });

  // 投票数を集計
  const voteStats = new Map<string, { likes: number; dislikes: number }>();
  allVotes?.forEach((vote) => {
    const stats = voteStats.get(vote.person_id) || { likes: 0, dislikes: 0 };
    if (vote.vote_type === 'like') {
      stats.likes++;
    } else {
      stats.dislikes++;
    }
    voteStats.set(vote.person_id, stats);
  });

  // コメントをperson_idでグルーピング
  const commentMap = new Map<string, typeof allComments>();
  allComments?.forEach((comment) => {
    if (!commentMap.has(comment.person_id)) {
      commentMap.set(comment.person_id, [comment]);
    }
  });

  // ランキングを作成
  const rankings: RankingPerson[] = people.map((person) => {
    const stats = voteStats.get(person.id) || { likes: 0, dislikes: 0 };
    const likeCount = stats.likes;
    const dislikeCount = stats.dislikes;
    const totalVotes = likeCount + dislikeCount;
    const likePercentage = totalVotes > 0 ? (likeCount / totalVotes) * 100 : 0;

    const comments = commentMap.get(person.id);
    const latestComment = comments?.[0]
      ? {
          content: comments[0].content,
          name: comments[0].name || '匿名',
          createdAt: comments[0].created_at,
        }
      : undefined;

    return {
      ...person,
      likeCount,
      dislikeCount,
      totalVotes,
      likePercentage,
      latestComment,
    };
  });

  // 投票数が1以上の人物のみをフィルタし、好感度でソート
  return rankings
    .filter((p) => p.totalVotes > 0)
    .sort((a, b) => b.likePercentage - a.likePercentage)
    .slice(0, RANKING_LIMIT);
}

export async function getUnpopularRanking(): Promise<RankingPerson[]> {
  const people = peopleData as Person[];
  
  // 全投票を一度に取得
  const { data: allVotes } = await supabase
    .from('votes')
    .select('person_id, vote_type');

  // 全コメントを一度に取得（嫌い派）
  const { data: allComments } = await supabase
    .from('comments')
    .select('person_id, content, name, created_at, vote_type')
    .eq('is_hidden', false)
    .eq('vote_type', 'dislike')
    .order('created_at', { ascending: false });

  // 投票数を集計
  const voteStats = new Map<string, { likes: number; dislikes: number }>();
  allVotes?.forEach((vote) => {
    const stats = voteStats.get(vote.person_id) || { likes: 0, dislikes: 0 };
    if (vote.vote_type === 'like') {
      stats.likes++;
    } else {
      stats.dislikes++;
    }
    voteStats.set(vote.person_id, stats);
  });

  // コメントをperson_idでグルーピング
  const commentMap = new Map<string, typeof allComments>();
  allComments?.forEach((comment) => {
    if (!commentMap.has(comment.person_id)) {
      commentMap.set(comment.person_id, [comment]);
    }
  });

  // ランキングを作成
  const rankings: RankingPerson[] = people.map((person) => {
    const stats = voteStats.get(person.id) || { likes: 0, dislikes: 0 };
    const likeCount = stats.likes;
    const dislikeCount = stats.dislikes;
    const totalVotes = likeCount + dislikeCount;
    const likePercentage = totalVotes > 0 ? (likeCount / totalVotes) * 100 : 0;

    const comments = commentMap.get(person.id);
    const latestComment = comments?.[0]
      ? {
          content: comments[0].content,
          name: comments[0].name || '匿名',
          createdAt: comments[0].created_at,
        }
      : undefined;

    return {
      ...person,
      likeCount,
      dislikeCount,
      totalVotes,
      likePercentage,
      latestComment,
    };
  });

  // 投票数が1以上の人物のみをフィルタし、不人気順でソート
  return rankings
    .filter((p) => p.totalVotes > 0)
    .sort((a, b) => a.likePercentage - b.likePercentage)
    .slice(0, RANKING_LIMIT);
}

export async function getTrendingRanking(): Promise<RankingPerson[]> {
  const people = peopleData as Person[];

  // Get votes from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 過去7日間の全投票を一度に取得
  const { data: allVotes } = await supabase
    .from('votes')
    .select('person_id, vote_type, created_at')
    .gte('created_at', sevenDaysAgo.toISOString());

  // 過去7日間の全コメントを一度に取得（好き派・嫌い派両方）
  const { data: allComments } = await supabase
    .from('comments')
    .select('person_id, content, name, created_at, vote_type')
    .eq('is_hidden', false)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  // 投票数を集計
  const voteStats = new Map<string, { likes: number; dislikes: number }>();
  allVotes?.forEach((vote) => {
    const stats = voteStats.get(vote.person_id) || { likes: 0, dislikes: 0 };
    if (vote.vote_type === 'like') {
      stats.likes++;
    } else {
      stats.dislikes++;
    }
    voteStats.set(vote.person_id, stats);
  });

  // コメントをperson_idと派閥でグルーピング
  const likeCommentsMap = new Map<string, typeof allComments>();
  const dislikeCommentsMap = new Map<string, typeof allComments>();
  
  allComments?.forEach((comment) => {
    if (comment.vote_type === 'like') {
      if (!likeCommentsMap.has(comment.person_id)) {
        likeCommentsMap.set(comment.person_id, [comment]);
      }
    } else {
      if (!dislikeCommentsMap.has(comment.person_id)) {
        dislikeCommentsMap.set(comment.person_id, [comment]);
      }
    }
  });

  // ランキングを作成
  const rankings: RankingPerson[] = people.map((person) => {
    const stats = voteStats.get(person.id) || { likes: 0, dislikes: 0 };
    const likeCount = stats.likes;
    const dislikeCount = stats.dislikes;
    const totalVotes = likeCount + dislikeCount;
    const likePercentage = totalVotes > 0 ? (likeCount / totalVotes) * 100 : 0;

    // 好き派のコメントを優先、なければ嫌い派のコメント
    const likeComments = likeCommentsMap.get(person.id);
    const dislikeComments = dislikeCommentsMap.get(person.id);
    const selectedComment = likeComments?.[0] || dislikeComments?.[0];
    
    const latestComment = selectedComment
      ? {
          content: selectedComment.content,
          name: selectedComment.name || '匿名',
          createdAt: selectedComment.created_at,
          voteType: selectedComment.vote_type,
        }
      : undefined;

    return {
      ...person,
      likeCount,
      dislikeCount,
      totalVotes,
      likePercentage,
      latestComment,
    };
  });

  // 投票数が1以上の人物のみをフィルタし、投票数でソート
  return rankings
    .filter((p) => p.totalVotes > 0)
    .sort((a, b) => b.totalVotes - a.totalVotes)
    .slice(0, RANKING_LIMIT);
}
