'use client';

import Link from 'next/link';
import { Poll, PollOption } from '@/types/poll';
import { formatJST } from '@/lib/date-utils';

interface PollCardProps {
  poll: Poll;
  options: PollOption[];
  showRelatedPeople?: boolean;
  peopleNames?: Record<string, string>;
}

export default function PollCard({ poll, options, showRelatedPeople = false, peopleNames = {} }: PollCardProps) {
  const pollTypeLabel = {
    two_choice: '2択',
    three_plus_fixed: '3択以上（固定）',
    three_plus_open: '3択以上（追加可）',
  };

  return (
    <Link
      href={`/polls/${poll.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition p-4"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-800 flex-1">{poll.title}</h3>
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded ml-2 whitespace-nowrap">
          {pollTypeLabel[poll.poll_type]}
        </span>
      </div>
      
      {poll.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{poll.description}</p>
      )}

      <div className="space-y-1 mb-3">
        {options.slice(0, 3).map((option) => {
          const percentage = poll.total_votes > 0 
            ? Math.round((option.vote_count / poll.total_votes) * 100) 
            : 0;
          
          return (
            <div key={option.id} className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-700 truncate">{option.option_text}</span>
                <span className="text-gray-500 ml-2">{percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
        {options.length > 3 && (
          <p className="text-xs text-gray-500 mt-1">他 {options.length - 3} 件の選択肢</p>
        )}
      </div>

      {showRelatedPeople && poll.related_person_ids.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-gray-500">
            関連: {poll.related_person_ids.map(id => peopleNames[id] || '不明').join(', ')}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>総投票数: {poll.total_votes}</span>
        <span>{formatJST(poll.created_at, 'yyyy/MM/dd HH:mm')}</span>
      </div>
    </Link>
  );
}
