'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        {/* Top row: Logo and Desktop Navigation */}
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="text-2xl font-bold hover:opacity-80 transition">
            ヒカマーズ好き嫌い.com
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/people" className="hover:underline transition">
              全人物一覧
            </Link>
            <Link href="/polls" className="hover:underline transition">
              投票トーク
            </Link>
            <Link href="/ranking/popularity" className="hover:underline transition">
              好感度ランキング
            </Link>
            <Link href="/ranking/unpopular" className="hover:underline transition">
              不人気ランキング
            </Link>
            <Link href="/ranking/trending" className="hover:underline transition">
              トレンドランキング
            </Link>
          </nav>
        </div>
        
        {/* Search bar row */}
        <div className="pb-4">
          <form onSubmit={handleSearch} className="flex items-stretch shadow-lg max-w-md mx-auto md:mx-0">
            <input
              type="text"
              placeholder="あいまい検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-l-lg text-gray-900 bg-white border-2 border-white focus:outline-none focus:ring-2 focus:ring-yellow-300 placeholder:text-gray-500"
            />
            <button
              type="submit"
              className="bg-white text-purple-600 px-4 py-2.5 rounded-r-lg border-2 border-white hover:bg-gray-100 transition flex items-center justify-center"
              aria-label="検索"
              title="検索"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
        </div>
        
        {/* Mobile Navigation */}
        <nav className="md:hidden flex space-x-4 pb-4 overflow-x-auto">
          <Link href="/people" className="text-sm whitespace-nowrap hover:underline">
            全人物
          </Link>
          <Link href="/polls" className="text-sm whitespace-nowrap hover:underline">
            投票トーク
          </Link>
          <Link href="/ranking/popularity" className="text-sm whitespace-nowrap hover:underline">
            好感度
          </Link>
          <Link href="/ranking/unpopular" className="text-sm whitespace-nowrap hover:underline">
            不人気
          </Link>
          <Link href="/ranking/trending" className="text-sm whitespace-nowrap hover:underline">
            トレンド
          </Link>
        </nav>
      </div>
    </header>
  );
}
