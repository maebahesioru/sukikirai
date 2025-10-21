import Link from 'next/link';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { getPopularityRanking } from '@/lib/ranking';
import { getSidebarData } from '@/lib/sidebar-data';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function PopularityRankingPage() {
  const [rankings, sidebarData] = await Promise.all([
    getPopularityRanking(),
    getSidebarData(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h1 className="text-3xl font-bold text-pink-600 mb-2">好感度ランキング</h1>
              <p className="text-gray-600">好き派が多い人物のランキングです</p>
            </div>

            {/* Ranking List */}
            <div className="space-y-4">
              {rankings.map((person, index) => (
                <div
                  key={person.id}
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
                >
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl ${
                          index === 0
                            ? 'bg-yellow-500'
                            : index === 1
                            ? 'bg-gray-400'
                            : index === 2
                            ? 'bg-orange-600'
                            : 'bg-purple-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                    </div>

                    {/* Person Info */}
                    <div className="flex-1">
                      <Link
                        href={`/person/${person.id}`}
                        prefetch={false}
                        className="text-xl font-bold text-gray-800 hover:text-purple-600 transition"
                      >
                        {person.name}
                      </Link>

                      {/* Tags */}
                      <div className="flex gap-2 mt-2 mb-3">
                        {person.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Vote Stats */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-pink-600 font-bold">
                            好き: {person.likeCount}票 ({person.likePercentage.toFixed(1)}%)
                          </span>
                          <span className="text-purple-600 font-bold">
                            嫌い: {person.dislikeCount}票 ({(100 - person.likePercentage).toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden flex">
                          <div
                            className="bg-gradient-to-r from-pink-500 to-red-500 h-full transition-all duration-500"
                            style={{ width: `${person.likePercentage}%` }}
                          />
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
                            style={{ width: `${100 - person.likePercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Latest Comment */}
                      {person.latestComment && (
                        <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                          <p className="text-sm text-gray-700 mb-1">
                            <span className="font-bold text-pink-600">好き派の最新コメント：</span>
                          </p>
                          <p className="text-sm text-gray-700 mb-1">
                            {person.latestComment.content}
                          </p>
                          <p className="text-xs text-gray-500">
                            {person.latestComment.name} -{' '}
                            {format(new Date(person.latestComment.createdAt), 'yyyy-MM-dd HH:mm')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {rankings.length === 0 && (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                  <p className="text-gray-600">まだデータがありません</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Sidebar 
              trendingPeople={sidebarData.trendingPeople}
              latestComments={sidebarData.latestComments}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
