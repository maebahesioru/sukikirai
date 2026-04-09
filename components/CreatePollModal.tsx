'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { PollType } from '@/types/poll';
import { Person } from '@/types/person';


interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pollId: string) => void;
  people: Person[];
  userToken: string;
}

export default function CreatePollModal({ isOpen, onClose, onSuccess, people, userToken }: CreatePollModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<PollType>('two_choice');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [relatedPersonIds, setRelatedPersonIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [personSearchQuery, setPersonSearchQuery] = useState('');

  if (!isOpen) return null;

  // 人物を検索でフィルタリング
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
          userToken
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.pollId);
        onClose();
        // リセット
        setTitle('');
        setDescription('');
        setPollType('two_choice');
        setOptions(['', '']);
        setRelatedPersonIds([]);
      } else {
        setError(data.error || '投票の作成に失敗しました');
      }
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg w-full max-w-5xl my-8">
          <div className="sticky top-0 bg-white border-b p-4 sm:p-6 flex justify-between items-center rounded-t-lg z-10">
            <h2 className="text-2xl font-bold text-gray-800">投票トークを作成</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="閉じる">
              <X size={24} />
            </button>
          </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* reCAPTCHA */}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* 2カラムレイアウト */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左カラム：基本情報 */}
            <div className="space-y-6">
              <div>
                <label className="block text-base font-bold mb-2 text-gray-800">タイトル *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 text-base"
                  placeholder="例: 好きなヒカマーは？"
                />
              </div>

              <div>
                <label className="block text-base font-bold mb-2 text-gray-800">説明（任意）</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 text-base"
                  placeholder="投票の詳細説明"
                />
              </div>

              <div>
                <label className="block text-base font-bold mb-2 text-gray-800">投票形式 *</label>
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 text-base"
                  aria-label="投票形式を選択"
                >
                  <option value="two_choice">2択（選択肢追加不可）</option>
                  <option value="three_plus_fixed">3択以上（選択肢追加不可）</option>
                  <option value="three_plus_open">3択以上（他のユーザーが選択肢追加可能）</option>
                </select>
              </div>

              <div>
                <label className="block text-base font-bold mb-2 text-gray-800">選択肢 *</label>
                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        maxLength={100}
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 text-base"
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
                    className="mt-3 text-blue-600 hover:text-blue-800 flex items-center gap-2 text-base font-medium"
                  >
                    <Plus size={18} /> 選択肢を追加
                  </button>
                )}
              </div>
            </div>

            {/* 右カラム：関連する人物 */}
            <div>

              <div className="h-full flex flex-col">
                <label className="block text-base font-bold mb-2 text-gray-800">関連する人物（任意）</label>
                
                {/* 検索ボックス */}
                <input
                  type="text"
                  value={personSearchQuery}
                  onChange={(e) => setPersonSearchQuery(e.target.value)}
                  placeholder="人物を検索..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-3 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 text-base"
                />

                {/* 選択された人物の表示 */}
                {relatedPersonIds.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {relatedPersonIds.map((personId) => {
                      const person = people.find(p => p.id === personId);
                      return person ? (
                        <span
                          key={personId}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                        >
                          {person.name}
                          <button
                            type="button"
                            onClick={() => handlePersonToggle(personId)}
                            className="hover:text-purple-900"
                            aria-label={`${person.name}を削除`}
                          >
                            <X size={16} />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {/* 人物リスト */}
                <div className="flex-1 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2 bg-white" style={{ maxHeight: '400px' }}>
                  {filteredPeople.length > 0 ? (
                    filteredPeople.map((person) => (
                      <label key={person.id} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition">
                        <input
                          type="checkbox"
                          checked={relatedPersonIds.includes(person.id)}
                          onChange={() => handlePersonToggle(person.id)}
                          className="cursor-pointer mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-base text-gray-900 font-medium">{person.name}</div>
                          {person.description && (
                            <div className="text-sm text-gray-600 mt-0.5">{person.description}</div>
                          )}
                          {person.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {person.tags.map(tag => (
                                <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">
                      {personSearchQuery ? '該当する人物が見つかりません' : '人物がいません'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-base transition"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-bold text-base transition shadow-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? '作成中...' : '投票トークを作成'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
