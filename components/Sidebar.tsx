'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Person } from '@/types/person';
import { supabase, type Comment } from '@/lib/supabase';
import peopleData from '@/data/people.json';
import { format } from 'date-fns';

type CommentWithPerson = Comment & {
  personName: string;
};

type TrendingPerson = Person & {
  voteCount: number;
};

export default function Sidebar() {
  const [recentlyViewed, setRecentlyViewed] = useState<Person[]>([]);
  const [latestComments, setLatestComments] = useState<CommentWithPerson[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [trendingPeople, setTrendingPeople] = useState<TrendingPerson[]>([]);

  useEffect(() => {
    // Load recently viewed from localStorage
    const recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    setRecentlyViewed(recent.slice(0, 5));
    
    // Load latest comments
    fetchLatestComments();
    
    // Load trending people
    fetchTrendingPeople();
    
    // Extract popular tags from people data
    const allTags = (peopleData as Person[]).flatMap(person => person.tags);
    const uniqueTags = Array.from(new Set(allTags));
    setPopularTags(uniqueTags.slice(0, 10)); // Show top 10 tags
  }, []);

  const fetchLatestComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('is_hidden', false)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      const commentsWithPerson = data.map((comment) => {
        const person = (peopleData as Person[]).find((p) => p.id === comment.person_id);
        return {
          ...comment,
          personName: person?.name || '不明',
        };
      });
      setLatestComments(commentsWithPerson);
    }
  };

  const fetchTrendingPeople = async () => {
    // Get votes from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentVotes } = await supabase
      .from('votes')
      .select('person_id')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (recentVotes) {
      // Count votes per person
      const voteCounts = new Map<string, number>();
      recentVotes.forEach((vote) => {
        voteCounts.set(vote.person_id, (voteCounts.get(vote.person_id) || 0) + 1);
      });

      // Create trending people list
      const trending: TrendingPerson[] = (peopleData as Person[])
        .map((person) => ({
          ...person,
          voteCount: voteCounts.get(person.id) || 0,
        }))
        .filter((p) => p.voteCount > 0)
        .sort((a, b) => b.voteCount - a.voteCount)
        .slice(0, 20);

      setTrendingPeople(trending);
    }
  };

  return (
    <div className="space-y-6">
      {/* 最近見た人物 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800">最近見た人物</h3>
        {recentlyViewed.length > 0 ? (
          <ul className="space-y-2">
            {recentlyViewed.map((person) => (
              <li key={person.id}>
                <Link
                  href={`/person/${person.id}`}
                  prefetch={false}
                  className="text-purple-600 hover:underline"
                >
                  {person.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">まだ閲覧履歴がありません</p>
        )}
      </div>

      {/* 話題の人物 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800">話題の人物（過去7日）</h3>
        {trendingPeople.length > 0 ? (
          <ul className="space-y-2">
            {trendingPeople.map((person) => (
              <li key={person.id}>
                <Link href={`/person/${person.id}`} prefetch={false} className="text-purple-600 hover:underline flex justify-between items-center">
                  <span>{person.name}</span>
                  <span className="text-xs text-gray-500">{person.voteCount}票</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">投票データを読み込み中...</p>
        )}
      </div>

      {/* 話題のタグ */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800">話題のタグ</h3>
        {popularTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm cursor-pointer hover:bg-purple-200 transition"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">タグがありません</p>
        )}
      </div>

      {/* 新着コメント */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-800">新着コメント</h3>
        {latestComments.length > 0 ? (
          <div className="space-y-3 text-sm">
            {latestComments.map((comment) => (
              <div key={comment.id} className="border-b border-gray-200 pb-2 last:border-b-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link 
                    href={`/person/${comment.person_id}`}
                    prefetch={false}
                    className="text-purple-600 hover:underline font-medium"
                  >
                    {comment.personName}
                  </Link>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      comment.vote_type === 'like'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {comment.vote_type === 'like' ? '好き' : '嫌い'}
                  </span>
                </div>
                <p className="text-gray-700 text-xs mb-1 overflow-hidden" style={{ 
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {comment.content}
                </p>
                <p className="text-gray-500 text-xs">
                  {format(new Date(comment.created_at), 'MM/dd HH:mm')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">まだコメントがありません</p>
        )}
      </div>
    </div>
  );
}
