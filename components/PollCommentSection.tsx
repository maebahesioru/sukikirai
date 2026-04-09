'use client';

import { useState, useEffect } from 'react';
import { PollComment } from '@/types/poll';
import { formatJST } from '@/lib/date-utils';
import Cookies from 'js-cookie';


interface PollCommentSectionProps {
  pollId: string;
  comments: PollComment[];
}

export default function PollCommentSection({ pollId, comments: initialComments }: PollCommentSectionProps) {
  const [userToken, setUserToken] = useState('');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState(initialComments);

  useEffect(() => {
    let token = Cookies.get('user_token');
    if (!token) {
      token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      Cookies.set('user_token', token, { expires: 365 });
    }
    setUserToken(token);

    const savedName = localStorage.getItem('comment_name');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('コメントを入力してください');
      return;
    }

    setIsSubmitting(true);

    try {

      const response = await fetch('/api/polls/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId,
          commentNumber: comments.length + 1,
          name: name.trim() || null,
          userId: null,
          content: content.trim(),
          parentCommentId: null,
          userToken
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (name.trim()) {
          localStorage.setItem('comment_name', name.trim());
        }
        setContent('');
        setComments([data.comment, ...comments]);
      } else {
        setError(data.error || 'コメントの投稿に失敗しました');
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">コメント</h2>

      {/* コメントフォーム */}
      <form onSubmit={handleSubmit} className="mb-6">
        {/* reCAPTCHA */}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            placeholder="名前（任意）"
            className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="mb-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="コメントを入力"
            className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          <div className="text-sm text-gray-500 text-right mt-1">
            {content.length}/1000
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="w-full px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? '投稿中...' : 'コメントを投稿'}
        </button>
      </form>

      {/* コメント一覧 */}
      <div className="space-y-4">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-gray-700">
                  {comment.name || '匿名'}
                </span>
                <span className="text-xs text-gray-400">
                  {formatJST(comment.created_at, 'yyyy/MM/dd HH:mm')}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>👍 {comment.good_count}</span>
                <span>👎 {comment.bad_count}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-600 text-center py-8">まだコメントがありません</p>
        )}
      </div>
    </div>
  );
}
