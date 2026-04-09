'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import peopleData from '@/data/people.json';
import { Person } from '@/types/person';
import Cookies from 'js-cookie';
import { X, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { PollType } from '@/types/poll';

import Link from 'next/link';

export default function CreatePollPage() {
  const router = useRouter();
  const [userToken, setUserToken] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<PollType>('two_choice');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [relatedPersonIds, setRelatedPersonIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [personSearchQuery, setPersonSearchQuery] = useState('');

  const people = peopleData as Person[];

  useEffect(() => {
    let token = Cookies.get('user_token');
    if (!token) {
      token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      Cookies.set('user_token', token, { expires: 365 });
    }
    setUserToken(token);
  }, []);

  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(personSearchQuery.toLowerCase()) ||
    person.description?.toLowerCase().includes(personSearchQuery.toLowerCase()) ||
    person.tags.some(tag => tag.toLowerCase().includes(personSearchQuery.toLowerCase()))
  );

  const handleAddOption = () => {
    if (options.length < 20) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handlePersonToggle = (personId: string) => {
    setRelatedPersonIds(prev =>
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (pollType === 'two_choice' && validOptions.length !== 2) {
      setError('2択の場合は選択肢を2つ入力してください');
      return;
    }

    if ((pollType === 'three_plus_fixed' || pollType === 'three_plus_open') && validOptions.length < 3) {
      setError('3択以上の場合は選択肢を3つ以上入力してください');
      return;
    }

    setIsSubmitting(true);

    try {

      const response = await fetch('/api/polls/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          pollType,
          options: validOptions,
          relatedPersonIds,
          userToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/polls/${data.pollId}`);
      } else {
        setError(data.error || '投票の作成に失敗しました');
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!userToken) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-600">読み込み中...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/polls"
            className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 mb-4"
          >
            <ArrowLeft size={20} />
            投票一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">投票トークを作成</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* 2カラムレイアウト */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左カラム：基本情報（2/3幅） */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-800">タイトル *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    placeholder="例: 好きなヒカマーは？"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-800">説明（任意）</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    placeholder="投票の詳細説明"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-800">投票形式 *</label>
                  <select
                    value={pollType}
                    onChange={(e) => {
                      setPollType(e.target.value as PollType);
                      if (e.target.value === 'two_choice') {
                        setOptions(options.slice(0, 2));
                      } else if (options.length < 3) {
                        setOptions([...options, '']);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    aria-label="投票形式を選択"
                  >
                    <option value="two_choice">2択（選択肢追加不可）</option>
                    <option value="three_plus_fixed">3択以上（選択肢追加不可）</option>
                    <option value="three_plus_open">3択以上（他のユーザーが選択肢追加可能）</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-800">選択肢 *</label>
                  <div className="space-y-2">
                    {options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          maxLength={100}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                          placeholder={`選択肢 ${index + 1}`}
                        />
                        {options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            className="text-red-500 hover:text-red-700 p-2"
                            aria-label="選択肢を削除"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {pollType !== 'two_choice' && options.length < 20 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="mt-2 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                    >
                      <Plus size={16} /> 選択肢を追加
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 右カラム：関連する人物（1/3幅） */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                <label className="block text-sm font-bold mb-2 text-gray-800">関連する人物（任意）</label>
                
                <input
                  type="text"
                  value={personSearchQuery}
                  onChange={(e) => setPersonSearchQuery(e.target.value)}
                  placeholder="人物を検索..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 text-sm"
                />

                {relatedPersonIds.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {relatedPersonIds.map((personId) => {
                      const person = people.find(p => p.id === personId);
                      return person ? (
                        <span
                          key={personId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                        >
                          {person.name}
                          <button
                            type="button"
                            onClick={() => handlePersonToggle(personId)}
                            className="hover:text-purple-900"
                            aria-label={`${person.name}を削除`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                <div className="overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1 bg-white" style={{ maxHeight: '400px' }}>
                  {filteredPeople.length > 0 ? (
                    filteredPeople.map((person) => (
                      <label key={person.id} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition">
                        <input
                          type="checkbox"
                          checked={relatedPersonIds.includes(person.id)}
                          onChange={() => handlePersonToggle(person.id)}
                          className="cursor-pointer mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 font-medium">{person.name}</div>
                          {person.description && (
                            <div className="text-xs text-gray-600 mt-0.5 line-clamp-1">{person.description}</div>
                          )}
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-4">
                      {personSearchQuery ? '該当する人物が見つかりません' : '人物がいません'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-4 justify-end">
            <Link
              href="/polls"
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-bold transition shadow-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? '作成中...' : '投票トークを作成'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
