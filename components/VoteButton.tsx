'use client';

import { useState, useEffect, useRef } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import Cookies from 'js-cookie';
import { supabase } from '@/lib/supabase';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

type VoteButtonProps = {
  personId: string;
  onVote: (voteType: 'like' | 'dislike', likeCount: number, dislikeCount: number) => void;
  onCountsLoaded?: (likeCount: number, dislikeCount: number) => void;
};

export default function VoteButton({ personId, onVote, onCountsLoaded }: VoteButtonProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [voteType, setVoteType] = useState<'like' | 'dislike' | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);

  useEffect(() => {
    checkVoteStatus();
    fetchVoteCounts();
  }, [personId]);

  const checkVoteStatus = () => {
    const cookieKey = `vote_${personId}`;
    const lastVote = Cookies.get(cookieKey);
    if (lastVote) {
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
      }
    }
  };

  const fetchVoteCounts = async () => {
    const { data: likes } = await supabase
      .from('votes')
      .select('id', { count: 'exact' })
      .eq('person_id', personId)
      .eq('vote_type', 'like');
    
    const { data: dislikes } = await supabase
      .from('votes')
      .select('id', { count: 'exact' })
      .eq('person_id', personId)
      .eq('vote_type', 'dislike');

    const newLikeCount = likes?.length || 0;
    const newDislikeCount = dislikes?.length || 0;
    
    setLikeCount(newLikeCount);
    setDislikeCount(newDislikeCount);
    
    // Notify parent component of loaded counts
    if (onCountsLoaded) {
      onCountsLoaded(newLikeCount, newDislikeCount);
    }
  };

  const handleVote = async (type: 'like' | 'dislike') => {
    if (hasVoted) return;

    if (!turnstileToken) {
      alert('認証が必要です。少々お待ちください。');
      return;
    }

    setIsVerifying(true);

    try {
      const cookieId = Cookies.get('user_id') || generateUserId();
      if (!Cookies.get('user_id')) {
        Cookies.set('user_id', cookieId, { expires: 365 });
      }

      // Call vote API with Turnstile token and IP check
      const voteResponse = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId,
          voteType: type,
          cookieId,
          turnstileToken,
        }),
      });

      const voteData = await voteResponse.json();

      if (!voteData.success) {
        if (voteResponse.status === 429) {
          alert('このIPアドレスから本日既に投票されています。\n投票は1日1回までです。');
        } else {
          alert('投票に失敗しました。もう一度お試しください。');
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

  const generateUserId = () => {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
          
          <div className="flex justify-center mb-6">
            <Turnstile
              ref={turnstileRef}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAB7zVyyT42WhDQqg'}
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => {
                alert('認証に失敗しました。ページをリロードしてください。');
              }}
            />
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleVote('like')}
              disabled={!turnstileToken || isVerifying}
              className="flex-1 max-w-xs bg-gradient-to-r from-pink-500 to-red-500 text-white py-4 px-8 rounded-lg font-bold text-xl hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ThumbsUp className="w-6 h-6" />
              {isVerifying ? '処理中...' : '好き！'}
            </button>
            <button
              onClick={() => handleVote('dislike')}
              disabled={!turnstileToken || isVerifying}
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
