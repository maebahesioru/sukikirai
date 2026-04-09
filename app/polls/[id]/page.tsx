import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PollVoteSection from '@/components/PollVoteSection';
import PollCommentSection from '@/components/PollCommentSection';
import { supabase } from '@/lib/supabase';
import { Poll, PollOption } from '@/types/poll';
import peopleData from '@/data/people.json';
import { Person } from '@/types/person';
import Link from 'next/link';

export const revalidate = 10;

interface PollPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PollPageProps) {
  const { id } = await params;
  
  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('id', id)
    .single();

  if (!poll) {
    return {
      title: '投票が見つかりません',
    };
  }

  return {
    title: poll.title,
    description: poll.description || `${poll.title}についての投票トーク`,
  };
}

export default async function PollPage({ params }: PollPageProps) {
  const { id } = await params;

  // 投票トークの情報を取得
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('*')
    .eq('id', id)
    .single();

  if (pollError || !poll || poll.is_hidden) {
    notFound();
  }

  // 選択肢を取得
  const { data: options } = await supabase
    .from('poll_options')
    .select('*')
    .eq('poll_id', id)
    .order('option_order', { ascending: true });

  // コメントを取得
  const { data: comments } = await supabase
    .from('poll_comments')
    .select('*')
    .eq('poll_id', id)
    .eq('is_hidden', false)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: false })
    .limit(50);

  // 関連する人物情報を取得
  const relatedPeople = (peopleData as Person[]).filter(person =>
    poll.related_person_ids.includes(person.id)
  );

  const pollTypeLabel: Record<string, string> = {
    two_choice: '2択',
    three_plus_fixed: '3択以上（固定）',
    three_plus_open: '3択以上（追加可）',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* 投票情報 */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-800 flex-1">{poll.title}</h1>
                <span className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded ml-4 whitespace-nowrap">
                  {pollTypeLabel[poll.poll_type]}
                </span>
              </div>

              {poll.description && (
                <p className="text-gray-600 mb-4 whitespace-pre-wrap">{poll.description}</p>
              )}

              {relatedPeople.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-2">関連する人物</h3>
                  <div className="flex flex-wrap gap-2">
                    {relatedPeople.map((person) => (
                      <Link
                        key={person.id}
                        href={`/person/${person.id}`}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition"
                      >
                        {person.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500">
                総投票数: {poll.total_votes}
              </div>
            </div>

            {/* 投票セクション */}
            <PollVoteSection
              poll={poll}
              options={options || []}
            />

            {/* コメントセクション */}
            <PollCommentSection
              pollId={poll.id}
              comments={comments || []}
            />
          </div>

          <div className="lg:col-span-1">
            <Sidebar trendingPeople={[]} latestComments={[]} />
            
            {/* 関連する投票トーク */}
            {relatedPeople.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
                <h3 className="text-lg font-bold mb-4">関連する好き嫌い投票</h3>
                <div className="space-y-2">
                  {relatedPeople.map((person) => (
                    <Link
                      key={person.id}
                      href={`/person/${person.id}`}
                      className="block p-3 bg-gray-50 rounded hover:bg-gray-100 transition"
                    >
                      <p className="font-bold text-gray-800">{person.name}</p>
                      <p className="text-sm text-gray-600">{person.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
