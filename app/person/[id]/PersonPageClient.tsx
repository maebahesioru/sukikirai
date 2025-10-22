'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import VoteButton from '@/components/VoteButton';
import ShareButtons from '@/components/ShareButtons';
import CommentSection from '@/components/CommentSection';
import CommentForm from '@/components/CommentForm';
import Sidebar from '@/components/Sidebar';
import { PersonStructuredData, BreadcrumbStructuredData } from '@/components/StructuredData';
import { Person } from '@/types/person';
import peopleData from '@/data/people.json';
import Cookies from 'js-cookie';
import { supabase } from '@/lib/supabase';
import { TrendingPerson, CommentWithPerson } from '@/lib/sidebar-data';

interface PersonPageClientProps {
  personId: string;
  initialLikeCount?: number;
  initialDislikeCount?: number;
  trendingPeople: TrendingPerson[];
  latestComments: CommentWithPerson[];
}

export default function PersonPageClient({ 
  personId, 
  initialLikeCount = 0,
  initialDislikeCount = 0,
  trendingPeople, 
  latestComments 
}: PersonPageClientProps) {
  const [person, setPerson] = useState<Person | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteType, setVoteType] = useState<'like' | 'dislike' | null>(null);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [refreshComments, setRefreshComments] = useState(0);
  const [tagRanking, setTagRanking] = useState<Array<{ name: string; id: string; likePercentage: number }>>([]);

  useEffect(() => {
    // Find person
    const foundPerson = peopleData.find((p) => p.id === personId);
    if (foundPerson) {
      setPerson(foundPerson as Person);
      
      // Add to recently viewed
      const recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const filtered = recent.filter((p: Person) => p.id !== foundPerson.id);
      filtered.unshift(foundPerson);
      localStorage.setItem('recentlyViewed', JSON.stringify(filtered.slice(0, 10)));
    }

    // Check vote status
    const cookieKey = `vote_${personId}`;
    const lastVote = Cookies.get(cookieKey);
    if (lastVote) {
      const voteData = JSON.parse(lastVote);
      setVoteType(voteData.type);
      setHasVoted(true);
    }
  }, [personId]);

  const handleVote = (type: 'like' | 'dislike', likes: number, dislikes: number) => {
    setHasVoted(true);
    setVoteType(type);
    setLikeCount(likes);
    setDislikeCount(dislikes);
  };

  const handleCountsLoaded = (likes: number, dislikes: number) => {
    setLikeCount(likes);
    setDislikeCount(dislikes);
  };

  const fetchTagRanking = async () => {
    if (!person) return;

    // Get all people with same tags
    const peopleWithSameTags = (peopleData as Person[]).filter(p => 
      p.tags.some(tag => person.tags.includes(tag)) && p.id !== person.id
    );

    if (peopleWithSameTags.length === 0) {
      setTagRanking([]);
      return;
    }

    // 最適化：1回のクエリで全person_idの投票を取得
    const personIds = peopleWithSameTags.map(p => p.id);
    const { data: allVotes } = await supabase
      .from('votes')
      .select('person_id, vote_type')
      .in('person_id', personIds);

    // 各人物の投票数を集計
    const rankingData = peopleWithSameTags.map(p => {
      const personVotes = allVotes?.filter(v => v.person_id === p.id) || [];
      const likeCount = personVotes.filter(v => v.vote_type === 'like').length;
      const dislikeCount = personVotes.filter(v => v.vote_type === 'dislike').length;
      const total = likeCount + dislikeCount;
      const likePercentage = total > 0 ? (likeCount / total) * 100 : 0;

      return {
        name: p.name,
        id: p.id,
        likePercentage
      };
    });

    // Sort by like percentage (descending)
    const sorted = rankingData.sort((a, b) => b.likePercentage - a.likePercentage);
    setTagRanking(sorted.slice(0, 5)); // Top 5
  };

  useEffect(() => {
    if (person && hasVoted) {
      fetchTagRanking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, hasVoted]);

  if (!person) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-600">人物が見つかりません</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {person && (
        <>
          <PersonStructuredData
            personName={person.name}
            description={person.description || ''}
            likeCount={likeCount}
            dislikeCount={dislikeCount}
          />
          <BreadcrumbStructuredData
            items={[
              { name: 'ホーム', url: '/' },
              { name: person.name, url: `/person/${person.id}` }
            ]}
          />
        </>
      )}
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Person Header */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {person.name}
              </h1>
              {person.description && (
                <p className="text-gray-600">{person.description}</p>
              )}
              <div className="flex gap-2 mt-4">
                {person.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Vote Button */}
            <VoteButton 
              personId={personId}
              initialLikeCount={initialLikeCount}
              initialDislikeCount={initialDislikeCount}
              onVote={handleVote}
              onCountsLoaded={handleCountsLoaded}
            />

            {/* Share Buttons */}
            {hasVoted && voteType && (
              <ShareButtons 
                personName={person.name} 
                voteType={voteType}
                likeCount={likeCount}
                dislikeCount={dislikeCount}
              />
            )}

            {/* Tag Ranking (after vote) */}
            {hasVoted && person.tags.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <h3 className="text-lg font-bold mb-4 text-gray-800">
                  タグ内好感度ランキング
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  「{person.tags.join('・')}」タグを持つ人物の好感度ランキング
                </p>
                {tagRanking.length > 0 ? (
                  <div className="space-y-3">
                    {tagRanking.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-400 text-white' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <a
                          href={`/person/${item.id}`}
                          className="flex-1 text-gray-800 hover:text-purple-600 font-medium transition"
                        >
                          {item.name}
                        </a>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-pink-500 to-red-500 h-2 rounded-full"
                              style={{ width: `${item.likePercentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-pink-600 w-12 text-right">
                            {item.likePercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">同じタグを持つ他の人物がいません</p>
                )}
              </div>
            )}

            {/* Related People */}
            {person.relatedPeople.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <h3 className="text-lg font-bold mb-4 text-gray-800">関連人物</h3>
                <div className="flex flex-wrap gap-2">
                  {person.relatedPeople.map((relatedId) => {
                    const relatedPerson = peopleData.find((p) => p.id === relatedId);
                    return relatedPerson ? (
                      <a
                        key={relatedId}
                        href={`/person/${relatedId}`}
                        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
                      >
                        {relatedPerson.name}
                      </a>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Related Tags */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h3 className="text-lg font-bold mb-4 text-gray-800">関連タグ</h3>
              <div className="flex flex-wrap gap-2">
                {person.tags.map((tag) => (
                  <a
                    key={tag}
                    href={`/tag/${tag}`}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition"
                  >
                    #{tag}
                  </a>
                ))}
              </div>
            </div>

            {/* Comment Form */}
            {hasVoted && voteType && (
              <CommentForm
                personId={personId}
                personName={person.name}
                voteType={voteType}
                likeCount={likeCount}
                dislikeCount={dislikeCount}
                onCommentPosted={() => setRefreshComments(refreshComments + 1)}
              />
            )}

            {/* Comments */}
            <CommentSection personId={personId} hasVoted={hasVoted} key={refreshComments} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Sidebar 
              trendingPeople={trendingPeople}
              latestComments={latestComments}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
