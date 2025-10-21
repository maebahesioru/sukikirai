import Link from 'next/link';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { getTrendingRanking } from '@/lib/ranking';
import PeopleList from '@/components/PeopleList';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const trendingPeople = await getTrendingRanking();
  
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
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
              >
                <h2 className="text-xl font-bold text-pink-600 mb-2">好感度ランキング</h2>
                <p className="text-gray-600 text-sm">人気の高い人物をチェック</p>
              </Link>
              <Link
                href="/ranking/unpopular"
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
              >
                <h2 className="text-xl font-bold text-purple-600 mb-2">不人気ランキング</h2>
                <p className="text-gray-600 text-sm">不人気な人物をチェック</p>
              </Link>
              <Link
                href="/ranking/trending"
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
              <p className="text-gray-600 text-sm">まだコメントがありません</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Sidebar />
          </div>
        </div>
      </main>
    </div>
  );
}
