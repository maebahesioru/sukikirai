import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // 指定された日付の開始と終了時刻を設定
    const startDate = `${date}T00:00:00.000Z`;
    const endDate = `${date}T23:59:59.999Z`;

    // 1日のコメント数を取得
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('id')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (commentsError) {
      console.error('コメント数取得エラー:', commentsError);
      return NextResponse.json({ error: 'コメント数の取得に失敗しました' }, { status: 500 });
    }

    // 1日の投票数を取得
    const { data: votesData, error: votesError } = await supabase
      .from('votes')
      .select('vote_type')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (votesError) {
      console.error('投票数取得エラー:', votesError);
      return NextResponse.json({ error: '投票数の取得に失敗しました' }, { status: 500 });
    }

    // 1日のコメントリアクション数を取得
    const { data: reactionsData, error: reactionsError } = await supabase
      .from('comment_reactions')
      .select('reaction_type')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (reactionsError) {
      console.error('コメントリアクション数取得エラー:', reactionsError);
      return NextResponse.json({ error: 'コメントリアクション数の取得に失敗しました' }, { status: 500 });
    }

    // データを集計
    const totalComments = commentsData.length;
    const totalVotes = votesData.length;
    const likeVotes = votesData.filter(vote => vote.vote_type === 'like').length;
    const dislikeVotes = votesData.filter(vote => vote.vote_type === 'dislike').length;
    const totalReactions = reactionsData.length;
    const goodReactions = reactionsData.filter(reaction => reaction.reaction_type === 'good').length;
    const badReactions = reactionsData.filter(reaction => reaction.reaction_type === 'bad').length;

    return NextResponse.json({
      date,
      totalComments,
      totalVotes,
      likeVotes,
      dislikeVotes,
      totalReactions,
      goodReactions,
      badReactions
    });

  } catch (error) {
    console.error('アナリティクス取得エラー:', error);
    return NextResponse.json({ error: 'アナリティクスデータの取得に失敗しました' }, { status: 500 });
  }
}