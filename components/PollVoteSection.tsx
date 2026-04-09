'use client';

import { useState, useEffect } from 'react';
import { Poll, PollOption } from '@/types/poll';
import Cookies from 'js-cookie';
import { Plus } from 'lucide-react';


interface PollVoteSectionProps {
  poll: Poll;
  options: PollOption[];
}

export default function PollVoteSection({ poll, options: initialOptions }: PollVoteSectionProps) {
  const [userToken, setUserToken] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [options, setOptions] = useState(initialOptions);
  const [newOptionText, setNewOptionText] = useState('');
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let token = Cookies.get('user_token');
    if (!token) {
      token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      Cookies.set('user_token', token, { expires: 365 });
    }
    setUserToken(token);

    // 既に投票済みかチェック
    checkVoteStatus(token);
  }, []);

  const checkVoteStatus = async (token: string) => {
    try {
      const response = await fetch(`/api/polls/check-vote?pollId=${poll.id}&userToken=${token}`);
      const data = await response.json();
      if (data.hasVoted) {
        setHasVoted(true);
        setSelectedOption(data.optionId);
      }
    } catch (err) {
      console.error('Failed to check vote status:', err);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!userToken || hasVoted) return;

    setIsVoting(true);
    setError('');

    try {

      const response = await fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: poll.id,
          optionId,
          userToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setHasVoted(true);
        setSelectedOption(optionId);
        window.location.reload();
      } else {
        setError(data.error || '投票に失敗しました');
        if (data.currentOptionId) {
          setHasVoted(true);
          setSelectedOption(data.currentOptionId);
        }
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setIsVoting(false);
    }
  };

  const handleAddOption = async () => {
    if (!newOptionText.trim() || !userToken) return;

    setIsAddingOption(true);
    setError('');

    try {

      const response = await fetch('/api/polls/add-option', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: poll.id,
          optionText: newOptionText.trim(),
          userToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOptions([...options, data.option]);
        setNewOptionText('');
        setShowAddOption(false);
      } else {
        setError(data.error || '選択肢の追加に失敗しました');
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setIsAddingOption(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">投票する</h2>

      {/* reCAPTCHA */}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {options.map((option) => {
          const percentage = poll.total_votes > 0 
            ? Math.round((option.vote_count / poll.total_votes) * 100) 
            : 0;
          const isSelected = selectedOption === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={hasVoted || isVoting}
              className={`w-full text-left p-4 rounded-lg border-2 transition ${
                isSelected
                  ? 'border-purple-600 bg-purple-50'
                  : hasVoted
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-800">{option.option_text}</span>
                {hasVoted && (
                  <span className="text-sm font-bold text-purple-600">{percentage}%</span>
                )}
              </div>
              {hasVoted && (
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-purple-600 h-3 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
              {hasVoted && (
                <div className="text-sm text-gray-600 mt-1">
                  {option.vote_count} 票
                </div>
              )}
            </button>
          );
        })}
      </div>

      {poll.poll_type === 'three_plus_open' && (
        <div className="mt-4">
          {!showAddOption ? (
            <button
              onClick={() => setShowAddOption(true)}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              選択肢を追加
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                maxLength={100}
                placeholder="新しい選択肢を入力"
                className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddOption(false);
                    setNewOptionText('');
                  }}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                  disabled={isAddingOption}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddOption}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                  disabled={isAddingOption || !newOptionText.trim()}
                >
                  {isAddingOption ? '追加中...' : '追加'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {hasVoted && (
        <p className="text-sm text-gray-700 mt-4 text-center font-medium">
          投票ありがとうございました！
        </p>
      )}
    </div>
  );
}
