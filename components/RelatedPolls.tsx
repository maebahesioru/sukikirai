'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Poll, PollOption } from '@/types/poll';
import { formatJST } from '@/lib/date-utils';

interface RelatedPollsProps {
  personId: string;
}

export default function RelatedPolls({ personId }: RelatedPollsProps) {
  const [polls, setPolls] = useState<Array<{ poll: Poll; options: PollOption[] }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRelatedPolls();
  }, [personId]);

  const fetchRelatedPolls = async () => {
    try {
      const response = await fetch(`/api/polls/related?personId=${personId}`);
      const data = await response.json();
      if (data.success) {
        setPolls(data.polls);
      }
    } catch (error) {
      console.error('Failed to fetch related polls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-lg font-bold mb-4 text-gray-800">関連投票トーク</h3>
        <p className="text-gray-500 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (polls.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">関連投票トーク</h3>
        <Link
          href="/polls"
          className="text-sm text-purple-600 hover:text-purple-800"
        >
          すべて見る →
        </Link>
      </div>
      <div className="space-y-3">
        {polls.map(({ poll, options }) => {
          const topOption = options[0];
          const percentage = poll.total_votes > 0 
            ? Math.round((topOption.vote_count / poll.total_votes) * 100) 
            : 0;

          return (
            <Link
              key={poll.id}
              href={`/polls/${poll.id}`}
              className="block p-3 bg-gray-50 rounded hover:bg-gray-100 transition"
            >
              <h4 className="font-bold text-gray-800 mb-1">{poll.title}</h4>
              {poll.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-1">{poll.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>総投票数: {poll.total_votes}</span>
                <span>{formatJST(poll.created_at, 'MM/dd HH:mm')}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
