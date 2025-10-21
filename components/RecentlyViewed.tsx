'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Person } from '@/types/person';

export default function RecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<Person[]>([]);

  useEffect(() => {
    // Load recently viewed from localStorage
    const recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    setRecentlyViewed(recent.slice(0, 5));
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold mb-4 text-gray-800">最近見た人物</h3>
      {recentlyViewed.length > 0 ? (
        <ul className="space-y-2">
          {recentlyViewed.map((person) => (
            <li key={person.id}>
              <Link
                href={`/person/${person.id}`}
                prefetch={false}
                className="text-purple-600 hover:underline"
              >
                {person.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-sm">まだ閲覧履歴がありません</p>
      )}
    </div>
  );
}
