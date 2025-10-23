import Link from 'next/link';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { getTrendingRanking } from '@/lib/ranking';
import PeopleList from '@/components/PeopleList';
import { supabase } from '@/lib/supabase';
import { Person } from '@/types/person';
import peopleData from '@/data/people.json';
import { formatJST } from '@/lib/date-utils';
import { getCommentReactionCounts } from '@/lib/comment-reactions';

// ISRで10秒ごとに再検証（トップページはアクセスが多いのでキャッシュ活用）
export const revalidate = 10;

export default async function Home() {
  // データを並列取得して最適化
  const [trendingPeople, { data: comments }] = await Promise.all([
    getTrendingRanking(),
    supabase
      .from('comments')
      .select('*')
      .eq('is_hidden', false)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .limit(10), // 10件取得して両方で使用
  ]);

  // comment_reactionsから評価数を取得
  const commentIds = comments?.map(c => c.id) || [];
  const reactionCounts = await getCommentReactionCounts(commentIds);

  // コメントに人物名と評価数を追加
  const commentsWithPerson = comments?.map((comment) => {
    const person = (peopleData as Person[]).find((p) => p.id === comment.person_id);
    const reactions = reactionCounts[comment.id] || { good: 0, bad: 0 };
    return {
      ...comment,
      personName: person?.name || '不明',
      good_count: reactions.good,
      bad_count: reactions.bad,
    };
  }) || [];

  // トップページ用（10件全て）
  const mainCommentsWithPerson = commentsWithPerson;

  // サイドバー用（最初の5件のみ）
  const sidebarCommentsWithPerson = commentsWithPerson.slice(0, 5);

  // サイドバー用のトレンド人物（上位20人）
  const sidebarTrendingPeople = trendingPeople.slice(0, 20).map((person) => ({
    ...person,
    voteCount: person.totalVotes,
  }));
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg shadow-lg p-8 mb-8">
              <h1 className="text-4xl font-bold mb-4">ヒカマーズ好き嫌い.com</h1>
              <p className="text-lg">
                ヒカマー界隈のあの人のことどう思う？好き？嫌い？
                <br />
                みんなの意見を見てみよう！
              </p>
            </div>

            {/* Rankings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Link
                href="/ranking/popularity"
                prefetch={false}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
              >
                <h2 className="text-xl font-bold text-pink-600 mb-2">好感度ランキング</h2>
                <p className="text-gray-600 text-sm">人気の高い人物をチェック</p>
              </Link>
              <Link
                href="/ranking/unpopular"
                prefetch={false}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
              >
                <h2 className="text-xl font-bold text-purple-600 mb-2">不人気ランキング</h2>
                <p className="text-gray-600 text-sm">不人気な人物をチェック</p>
              </Link>
              <Link
                href="/ranking/trending"
                prefetch={false}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
              >
                <h2 className="text-xl font-bold text-blue-600 mb-2">トレンドランキング</h2>
                <p className="text-gray-600 text-sm">今話題の人物をチェック</p>
              </Link>
            </div>

            {/* People List */}
            <PeopleList people={trendingPeople} />

            {/* Latest Comments */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">新着コメント</h2>
              {mainCommentsWithPerson.length > 0 ? (
                <div className="space-y-4">
                  {mainCommentsWithPerson.map((comment) => (
                    <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Link 
                          href={`/person/${comment.person_id}`}
                          prefetch={false}
                          className="text-purple-600 hover:underline font-bold"
                        >
                          {comment.personName}
                        </Link>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            comment.vote_type === 'like'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {comment.vote_type === 'like' ? '好き派' : '嫌い派'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {comment.name || '匿名'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatJST(comment.created_at, 'yyyy/MM/dd HH:mm')}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>👍 {comment.good_count}</span>
                        <span>👎 {comment.bad_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">まだコメントがありません</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Sidebar 
              trendingPeople={sidebarTrendingPeople}
              latestComments={sidebarCommentsWithPerson}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
