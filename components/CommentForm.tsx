'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import DynamicTurnstile, { type TurnstileInstance } from '@/components/DynamicTurnstile';
import Cookies from 'js-cookie';

type CommentFormProps = {
  personId: string;
  personName: string;
  voteType: 'like' | 'dislike';
  likeCount: number;
  dislikeCount: number;
  onCommentPosted: () => void;
};

export default function CommentForm({ personId, personName, voteType, likeCount, dislikeCount, onCommentPosted }: CommentFormProps) {
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [content, setContent] = useState('');
  const [selectedVoteType, setSelectedVoteType] = useState<'like' | 'dislike'>(voteType);
  const [tweetEnabled, setTweetEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const MAX_CHARS = 280;
  const MAX_NAME_LENGTH = 50;

  // 全角文字を2、半角文字を1としてカウント
  const getCharCount = (text: string): number => {
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      // 半角文字（ASCII）は1、全角文字は2としてカウント
      count += charCode <= 0x7F ? 1 : 2;
    }
    return count;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    if (newName.length <= MAX_NAME_LENGTH) {
      setName(newName);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const charCount = getCharCount(newContent);
    
    if (charCount <= MAX_CHARS) {
      setContent(newContent);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      alert('コメントを入力してください');
      return;
    }

    const charCount = getCharCount(content);
    if (charCount > MAX_CHARS) {
      alert(`コメントは全角${Math.floor(MAX_CHARS / 2)}文字（半角${MAX_CHARS}文字）以内で入力してください`);
      return;
    }

    if (!turnstileToken) {
      alert('認証が必要です。少々お待ちください。');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if user has agreed to terms
      const userToken = Cookies.get('user_token');
      if (!userToken) {
        alert('コメント投稿には利用規約への同意が必要です。ページをリロードして利用規約に同意してください。');
        setIsSubmitting(false);
        return;
      }

      // Get comment number
      const { count } = await supabase
        .from('comments')
        .select('id', { count: 'exact' })
        .eq('person_id', personId);

      const commentNumber = (count || 0) + 1;

      // Post comment via API (server-side Turnstile verification)
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId,
          commentNumber,
          name: name.trim(),
          userId: userId.trim(),
          voteType: selectedVoteType,
          content: content.trim(),
          userToken,
          turnstileToken,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        if (response.status === 400 && data.error === 'Turnstile verification failed') {
          alert('認証に失敗しました。ページをリロードして再度お試しください。');
        } else {
          alert('コメントの投稿に失敗しました');
        }
        setIsSubmitting(false);
        return;
      }

      // Open Twitter if enabled
      if (tweetEnabled) {
        const totalVotes = likeCount + dislikeCount;
        const likePercentage = totalVotes > 0 ? Math.round((likeCount / totalVotes) * 100) : 0;
        const dislikePercentage = 100 - likePercentage;
        
        const tweetText = `【${selectedVoteType === 'like' ? '好き派' : '嫌い派'}】としてコメントを投稿しました！\n\n「${content.trim()}」\n\n#${personName} のこと好き？嫌い？\n【好き派】${likePercentage}% vs【嫌い派】${dislikePercentage}%\n\n#ヒカマーズ好き嫌いcom`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(window.location.href)}`;
        window.open(twitterUrl, '_blank');
      }

      // Reset form
      setName('');
      setUserId('');
      setContent('');
      
      alert('コメントを投稿しました');
      onCommentPosted();
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('コメントの投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h3 className="text-xl font-bold mb-4 text-gray-800">コメントを投稿</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              名前（任意）
            </label>
            <span className={`text-sm ${name.length > MAX_NAME_LENGTH ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
              {name.length} / {MAX_NAME_LENGTH}
            </span>
          </div>
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="匿名"
            maxLength={MAX_NAME_LENGTH}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            なりすまし防止用ID（任意）
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="IDを入力"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            コメントする派閥を選択
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setSelectedVoteType('like')}
              className={`flex-1 py-3 px-6 rounded-lg font-bold transition ${
                selectedVoteType === 'like'
                  ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              好き派として投稿
            </button>
            <button
              type="button"
              onClick={() => setSelectedVoteType('dislike')}
              className={`flex-1 py-3 px-6 rounded-lg font-bold transition ${
                selectedVoteType === 'dislike'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              嫌い派として投稿
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ※投票は「{voteType === 'like' ? '好き' : '嫌い'}」でしたが、コメントは別の派閥で投稿できます
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              コメント本文 <span className="text-red-500">*</span>
            </label>
            <span className={`text-sm ${getCharCount(content) > MAX_CHARS ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
              {getCharCount(content)} / {MAX_CHARS}
            </span>
          </div>
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="コメントを入力..."
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            ※全角{Math.floor(MAX_CHARS / 2)}文字（半角{MAX_CHARS}文字）まで入力できます
          </p>
        </div>

        <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <input
            type="checkbox"
            id="tweetCheckbox"
            checked={tweetEnabled}
            onChange={(e) => setTweetEnabled(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="tweetCheckbox" className="text-sm text-gray-700 cursor-pointer flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Xでツイートする
          </label>
        </div>

        <div className="flex justify-center my-4">
            <DynamicTurnstile
              ref={turnstileRef}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAB7zVyyT42WhDQqg'}
              onSuccess={(token: string) => setTurnstileToken(token)}
              onError={() => {
                alert('認証に失敗しました。ページをリロードしてください。');
              }}
            />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !turnstileToken}
          className={`w-full py-3 px-6 rounded-lg font-bold text-white transition ${
            isSubmitting || !turnstileToken
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90'
          }`}
        >
          {isSubmitting ? '投稿中...' : 'コメントを投稿'}
        </button>
      </form>
    </div>
  );
}
