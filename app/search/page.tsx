'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Person } from '@/types/person';
import peopleData from '@/data/people.json';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Person[]>([]);

  useEffect(() => {
    if (query) {
      // Fuzzy search implementation
      const searchResults = (peopleData as Person[]).filter((person) => {
        const lowerQuery = query.toLowerCase();
        
        // Check name
        if (person.name.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        
        // Check tags
        if (person.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
          return true;
        }
        
        // Check description
        if (person.description?.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        
        return false;
      });
      
      setResults(searchResults);
    } else {
      setResults([]);
    }
  }, [query]);

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">検索結果</h1>
        <p className="text-gray-600">
          「<span className="font-bold text-purple-600">{query}</span>」の検索結果：
          {results.length}件
        </p>
      </div>

      {/* Results Grid */}
      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {results.map((person) => (
            <Link
              key={person.id}
              href={`/person/${person.id}`}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl hover:border-purple-500 hover:border-2 transition"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-2">{person.name}</h3>
              {person.description && (
                <p className="text-sm text-gray-600 mb-3">{person.description}</p>
              )}
              <div className="flex flex-wrap gap-2">
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
      ) : query ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <p className="text-gray-600">検索結果が見つかりませんでした</p>
          <p className="text-sm text-gray-500 mt-2">
            別のキーワードで検索してみてください
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <p className="text-gray-600">検索ワードを入力してください</p>
        </div>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Suspense fallback={
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <p className="text-gray-600">読み込み中...</p>
              </div>
            }>
              <SearchResults />
            </Suspense>
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
