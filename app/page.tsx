'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Person } from '@/types/person';
import peopleData from '@/data/people.json';

const ITEMS_PER_PAGE = 10;

export default function Home() {
  const people = peopleData as Person[];
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(people.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPeople = people.slice(startIndex, endIndex);
  
  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const getPageNumbers = () => {
    const pages = [];
    const showPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    const endPage = Math.min(totalPages, startPage + showPages - 1);
    
    if (endPage - startPage < showPages - 1) {
      startPage = Math.max(1, endPage - showPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };
  
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
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">人物一覧</h2>
                <p className="text-sm text-gray-600">
                  {startIndex + 1}〜{Math.min(endIndex, people.length)}件 / 全{people.length}件
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {currentPeople.map((person) => (
                  <Link
                    key={person.id}
                    href={`/person/${person.id}`}
                    prefetch={false}
                    className="border border-gray-200 rounded-lg p-4 hover:border-purple-500 hover:bg-purple-50 transition"
                  >
                    <h3 className="text-lg font-bold text-gray-800">{person.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{person.description}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {person.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* Pagination */}
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="前のページ"
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {getPageNumbers()[0] > 1 && (
                  <>
                    <button
                      onClick={() => goToPage(1)}
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition"
                    >
                      1
                    </button>
                    {getPageNumbers()[0] > 2 && (
                      <span className="px-2 text-gray-500">...</span>
                    )}
                  </>
                )}
                
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-4 py-2 rounded-lg border transition ${
                      currentPage === page
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                  <>
                    {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                      <span className="px-2 text-gray-500">...</span>
                    )}
                    <button
                      onClick={() => goToPage(totalPages)}
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="次のページ"
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

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
