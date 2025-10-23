'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import Cookies from 'js-cookie';
import { supabase } from '@/lib/supabase';

type VoteButtonProps = {
  personId: string;
  initialLikeCount?: number;
  initialDislikeCount?: number;
  onVote: (voteType: 'like' | 'dislike', likeCount: number, dislikeCount: number) => void;
  onCountsLoaded?: (likeCount: number, dislikeCount: number) => void;
};

export default function VoteButton({ 
  personId, 
  initialLikeCount,
  initialDislikeCount,
  onVote, 
  onCountsLoaded 
}: VoteButtonProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [voteType, setVoteType] = useState<'like' | 'dislike' | null>(null);
  const [likeCount, setLikeCount] = useState(initialLikeCount ?? 0);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount ?? 0);
  const [isVerifying, setIsVerifying] = useState(false);

  // 初期値が変更された時に状態を更新
  useEffect(() => {
    if (initialLikeCount !== undefined) {
      setLikeCount(initialLikeCount);
    }
    if (initialDislikeCount !== undefined) {
      setDislikeCount(initialDislikeCount);
    }
  }, [initialLikeCount, initialDislikeCount]);

  useEffect(() => {
    checkVoteStatus();
    // 初期値が提供されていない場合のみfetch
    if (initialLikeCount === undefined || initialDislikeCount === undefined) {
      fetchVoteCounts();
    } else if (onCountsLoaded) {
      // 初期値がある場合は親に通知
      onCountsLoaded(initialLikeCount, initialDislikeCount);
    }
  }, [personId]);

  const checkVoteStatus = async () => {
    // まずCookieをチェック
    const cookieKey = `vote_${personId}`;
    const lastVote = Cookies.get(cookieKey);
    if (lastVote) {
      try {
        const voteData = JSON.parse(lastVote);
        const lastVoteDate = new Date(voteData.date);
        const today = new Date();
        
        // Check if vote was today
        if (
          lastVoteDate.getFullYear() === today.getFullYear() &&
          lastVoteDate.getMonth() === today.getMonth() &&
          lastVoteDate.getDate() === today.getDate()
        ) {
          setHasVoted(true);
          setVoteType(voteData.type);
          return;
        }
      } catch (e) {
        // Cookie解析エラー時は削除
        Cookies.remove(cookieKey);
      }
    }

    // Cookieがない場合、サーバーから今日の投票を確認
    const userToken = Cookies.get('user_token');
    if (userToken) {
      // 今日の00:00:00のタイムスタンプ
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: existingVotes } = await supabase
        .from('votes')
        .select('vote_type, created_at')
        .eq('person_id', personId)
        .eq('cookie_id', userToken)
        .gte('created_at', todayISO)
        .limit(1);

      if (existingVotes && existingVotes.length > 0) {
        const voteType = existingVotes[0].vote_type as 'like' | 'dislike';
        setHasVoted(true);
        setVoteType(voteType);
        // Cookieにも保存
        Cookies.set(
          cookieKey,
          JSON.stringify({ type: voteType, date: new Date().toISOString() }),
          { expires: 1 } // 1日間保持
        );
      }
    }
  };

  const fetchVoteCounts = async () => {
    // 最適化：1回のクエリで全投票を取得し、クライアント側で集計
    const { data: votes } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('person_id', personId);

    const newLikeCount = votes?.filter(v => v.vote_type === 'like').length || 0;
    const newDislikeCount = votes?.filter(v => v.vote_type === 'dislike').length || 0;
    
    setLikeCount(newLikeCount);
    setDislikeCount(newDislikeCount);
    
    // Notify parent component of loaded counts
    if (onCountsLoaded) {
      onCountsLoaded(newLikeCount, newDislikeCount);
    }
  };

  const handleVote = async (type: 'like' | 'dislike') => {
    if (hasVoted) return;

    setIsVerifying(true);

    try {
      // Check if user has agreed to terms
      const userToken = Cookies.get('user_token');
      if (!userToken) {
        alert('投票するには利用規約への同意が必要です。ページをリロードして利用規約に同意してください。');
        setIsVerifying(false);
        return;
      }

      // Call vote API
      const voteResponse = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId,
          voteType: type,
          userToken,
        }),
      });

      const voteData = await voteResponse.json();

      if (!voteData.success) {
        if (voteResponse.status === 429) {
          alert('今日は既に投票済みです。\n\n投票は1日1回可能です。明日また投票してください。');
          // 投票済み状態に設定（サーバーから返された投票タイプを使用）
          const existingVoteType = voteData.voteType || type;
          setHasVoted(true);
          setVoteType(existingVoteType);
          // Cookieにも保存
          const cookieKey = `vote_${personId}`;
          Cookies.set(
            cookieKey,
            JSON.stringify({ type: existingVoteType, date: new Date().toISOString() }),
            { expires: 1 }
          );
        } else {
          const errorMsg = voteData.error || '投票に失敗しました。もう一度お試しください。';
          alert(errorMsg);
        }
        setIsVerifying(false);
        return;
      }

      // Save vote to cookie
      const cookieKey = `vote_${personId}`;
      Cookies.set(
        cookieKey,
        JSON.stringify({ type, date: new Date().toISOString() }),
        { expires: 1 }
      );

      setHasVoted(true);
      setVoteType(type);
      
      const newLikeCount = type === 'like' ? likeCount + 1 : likeCount;
      const newDislikeCount = type === 'dislike' ? dislikeCount + 1 : dislikeCount;
      
      setLikeCount(newLikeCount);
      setDislikeCount(newDislikeCount);

      onVote(type, newLikeCount, newDislikeCount);
    } catch (error) {
      console.error('投票エラー:', error);
      alert('投票に失敗しました。もう一度お試しください。');
    } finally {
      setIsVerifying(false);
    }
  };


  const likePercentage = likeCount + dislikeCount > 0
    ? (likeCount / (likeCount + dislikeCount)) * 100
    : 50;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        この人のこと、好き？嫌い？
      </h2>
      
      {!hasVoted ? (
        <>
          <p className="text-center text-gray-600 mb-4">
            「好き！」か「嫌い！」に投票して みんなのコメントを見てみよう！
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleVote('like')}
              disabled={isVerifying}
              className="flex-1 max-w-xs bg-gradient-to-r from-pink-500 to-red-500 text-white py-4 px-8 rounded-lg font-bold text-xl hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ThumbsUp className="w-6 h-6" />
              {isVerifying ? '処理中...' : '好き！'}
            </button>
            <button
              onClick={() => handleVote('dislike')}
              disabled={isVerifying}
              className="flex-1 max-w-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 px-8 rounded-lg font-bold text-xl hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ThumbsDown className="w-6 h-6" />
              {isVerifying ? '処理中...' : '嫌い！'}
            </button>
          </div>
        </>
      ) : (
        <div>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-pink-600 font-bold">好き: {likeCount}票 ({likePercentage.toFixed(1)}%)</span>
              <span className="text-purple-600 font-bold">嫌い: {dislikeCount}票 ({(100 - likePercentage).toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden flex">
              <div
                className="bg-gradient-to-r from-pink-500 to-red-500 h-full transition-all duration-500"
                style={{ width: `${likePercentage}%` }}
              />
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
                style={{ width: `${100 - likePercentage}%` }}
              />
            </div>
          </div>
          <p className="text-center text-gray-600 mt-4">
            あなたは「
            <span className={voteType === 'like' ? 'text-pink-600 font-bold' : 'text-purple-600 font-bold'}>
              {voteType === 'like' ? '好き！' : '嫌い！'}
            </span>
            」に投票しました
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            ※投票は1日1回までです
          </p>
        </div>
      )}
    </div>
  );
}
