'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RankingPerson } from '@/lib/ranking';

const ITEMS_PER_PAGE = 10;

export default function PeopleList({ people }: { people: RankingPerson[] }) {
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
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">人物一覧（トレンド順）</h2>
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
            {person.totalVotes > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                過去7日: {person.totalVotes}票
              </div>
            )}
          </Link>
        ))}
      </div>
      
      {/* Pagination */}
      <div className="flex justify-center items-center gap-1 sm:gap-2 mt-6 px-2 overflow-x-auto">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="前のページ"
          className="flex-shrink-0 px-2 sm:px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        
        {getPageNumbers()[0] > 1 && (
          <>
            <button
              onClick={() => goToPage(1)}
              className="flex-shrink-0 px-2 sm:px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition text-sm sm:text-base"
            >
              1
            </button>
            {getPageNumbers()[0] > 2 && (
              <span className="px-1 sm:px-2 text-gray-500 text-sm">...</span>
            )}
          </>
        )}
        
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => goToPage(page)}
            className={`flex-shrink-0 px-2 sm:px-4 py-2 rounded-lg border transition text-sm sm:text-base ${
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
              <span className="px-1 sm:px-2 text-gray-500 text-sm">...</span>
            )}
            <button
              onClick={() => goToPage(totalPages)}
              className="flex-shrink-0 px-2 sm:px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition text-sm sm:text-base"
            >
              {totalPages}
            </button>
          </>
        )}
        
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="次のページ"
          className="flex-shrink-0 px-2 sm:px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}
