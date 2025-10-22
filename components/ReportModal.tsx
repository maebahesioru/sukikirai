'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

type ReportReason = 
  | '殺害・爆破予告'
  | '個人情報の晒し'
  | '自殺ほのめかし'
  | '誹謗中傷・差別的表現'
  | 'なりすまし・嘘の情報'
  | 'スパム・宣伝'
  | '単に気に入らない'
  | '不適切な表現・悪質なネタ'
  | '自分のコメントを消してほしい';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => void;
  isSubmitting?: boolean;
}

const reportReasons: ReportReason[] = [
  '殺害・爆破予告',
  '個人情報の晒し',
  '自殺ほのめかし',
  '誹謗中傷・差別的表現',
  'なりすまし・嘘の情報',
  'スパム・宣伝',
  '単に気に入らない',
  '不適切な表現・悪質なネタ',
  '自分のコメントを消してほしい',
];

export default function ReportModal({ isOpen, onClose, onSubmit, isSubmitting = false }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedReason) {
      alert('通報理由を選択してください');
      return;
    }
    onSubmit(selectedReason, details);
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDetails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-gray-800">コメントを通報</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={isSubmitting}
            aria-label="閉じる"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 説明 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              不適切な内容や規約違反のコメントを通報してください。
              通報内容は運営が確認し、適切な対応を行います。
            </p>
          </div>

          {/* 理由選択 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              通報理由を選択してください <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {reportReasons.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                    selectedReason === reason
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value as ReportReason)}
                    className="w-4 h-4 text-red-500 focus:ring-red-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700 font-medium">{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 詳細（任意） */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              詳細・備考（任意）
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="具体的な内容や補足情報があれば入力してください"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
              maxLength={500}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              {details.length}/500文字
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-xl">
          <button
            onClick={handleClose}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition"
            disabled={isSubmitting}
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-white transition ${
              !selectedReason || isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isSubmitting ? '送信中...' : '通報する'}
          </button>
        </div>
      </div>
    </div>
  );
}
