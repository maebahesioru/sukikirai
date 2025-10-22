'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Users, Tag, Search, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import people from '@/data/people.json';

type Person = {
  id: string;
  name: string;
  tags: string[];
  description?: string;
};

export default function PeoplePageClient() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // すべてのタグを取得（重複排除）
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    people.forEach((person: Person) => {
      person.tags.forEach((tag: string) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, []);

  // タグごとの人数をカウント
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    people.forEach((person: Person) => {
      person.tags.forEach((tag: string) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, []);

  // フィルタリングされた人物リスト
  const filteredPeople = useMemo(() => {
    let filtered = people as Person[];

    // タグでフィルタリング
    if (selectedTag) {
      filtered = filtered.filter((person) =>
        person.tags.includes(selectedTag)
      );
    }

    // 検索クエリでフィルタリング
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (person) =>
          person.name.toLowerCase().includes(query) ||
          person.id.toLowerCase().includes(query) ||
          person.description?.toLowerCase().includes(query) ||
          person.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [selectedTag, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* ページヘッダー */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-800">全人物一覧</h1>
          </div>
          <p className="text-gray-600">
            登録されている全{people.length}人の人物を表示しています。タグや検索で絞り込めます。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* サイドバー - タグフィルタ */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-800">タグ</h2>
              </div>

              {/* 全て表示ボタン */}
              <button
                onClick={() => setSelectedTag(null)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-2 transition ${
                  selectedTag === null
                    ? 'bg-purple-100 text-purple-700 font-bold'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>すべて</span>
                  <span className="text-sm text-gray-500">{people.length}</span>
                </div>
              </button>

              {/* タグリスト */}
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      selectedTag === tag
                        ? 'bg-purple-100 text-purple-700 font-bold'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{tag}</span>
                      <span className="text-xs text-gray-500">
                        {tagCounts[tag]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* メインコンテンツ - 人物リスト */}
          <div className="lg:col-span-3">
            {/* 検索バー */}
            <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="名前、ID、説明で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* フィルタ情報 */}
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              {selectedTag && (
                <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                  <Tag className="w-4 h-4" />
                  <span>{selectedTag}</span>
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="hover:text-purple-900"
                  >
                    ×
                  </button>
                </div>
              )}
              <span>
                {filteredPeople.length}人
                {filteredPeople.length !== people.length &&
                  ` / ${people.length}人中`}
              </span>
            </div>

            {/* 人物グリッド */}
            {filteredPeople.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  該当する人物が見つかりませんでした
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredPeople.map((person) => (
                  <Link
                    key={person.id}
                    href={`/person/${person.id}`}
                    className="bg-white rounded-lg shadow hover:shadow-xl transition p-4 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-gray-800 group-hover:text-purple-600 transition">
                        {person.name}
                      </h3>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition" />
                    </div>

                    {person.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {person.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {person.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
