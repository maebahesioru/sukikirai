import Link from 'next/link';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PollCard from '@/components/PollCard';
import { supabase } from '@/lib/supabase';
import { Poll, PollOption } from '@/types/poll';
import peopleData from '@/data/people.json';
import { Person } from '@/types/person';

export const revalidate = 30;

export const metadata = {
  title: '投票トーク一覧',
  description: 'ヒカマー界隈の投票トーク一覧。みんなの意見を見てみよう！',
};

export default async function PollsPage() {
  // 投票トーク一覧を取得
  const { data: polls } = await supabase
    .from('polls')
    .select('*')
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(50);

  // 各投票の選択肢を取得
  const pollsWithOptions = await Promise.all(
    (polls || []).map(async (poll: Poll) => {
      const { data: options } = await supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', poll.id)
        .order('option_order', { ascending: true });

      return {
        poll,
        options: options || [],
      };
    })
  );

  // 人物名のマップを作成
  const peopleNames = (peopleData as Person[]).reduce((acc, person) => {
    acc[person.id] = person.name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg p-6 mb-8">
              <h1 className="text-3xl font-bold mb-2">投票トーク</h1>
              <p className="text-lg">みんなでアンケートを投稿して意見を共有しよう！</p>
            </div>

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">投票一覧</h2>
              <Link
                href="/polls/create"
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition font-medium"
              >
                投票を作成
              </Link>
            </div>

            {pollsWithOptions.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {pollsWithOptions.map(({ poll, options }) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    options={options}
                    showRelatedPeople={true}
                    peopleNames={peopleNames}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <p className="text-gray-600 mb-4">まだ投票がありません</p>
                <Link
                  href="/polls/create"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition"
                >
                  最初の投票を作成
                </Link>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <Sidebar trendingPeople={[]} latestComments={[]} />
          </div>
        </div>
      </main>
    </div>
  );
}
