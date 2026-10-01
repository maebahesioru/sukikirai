"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { REPORT_REASONS, type ReportReason } from "@/lib/constants";

export default function ReportModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => void;
  isSubmitting?: boolean;
}) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedReason) {
      alert("通報理由を選択してください");
      return;
    }
    onSubmit(selectedReason, details);
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDetails("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-panel border border-line rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-panel border-b border-line px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-bad" />
            <h2 className="text-lg font-bold">コメントを通報</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-mut hover:text-txt transition"
            disabled={isSubmitting}
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-bad/10 border border-bad/30 rounded-lg p-3">
            <p className="text-sm text-txt/90">
              不適切な内容や規約違反のコメントを通報してください。通報内容は運営が確認し、適切な対応を行います。
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              通報理由を選択してください <span className="text-bad">*</span>
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition text-sm ${
                    selectedReason === reason
                      ? "border-bad bg-bad/10"
                      : "border-line hover:border-line2 bg-panel2"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value as ReportReason)}
                    className="w-4 h-4 accent-red-500"
                    disabled={isSubmitting}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">詳細・備考（任意）</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="具体的な内容や補足情報があれば入力してください"
              className="w-full px-3 py-2 rounded-lg border border-line resize-none text-sm focus:outline-none focus:ring-2 focus:ring-bad/50"
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
            />
            <p className="text-xs text-mut mt-1">{details.length}/500文字</p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-panel border-t border-line px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl border border-line font-medium text-mut hover:text-txt transition"
            disabled={isSubmitting}
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            className={`flex-1 py-2.5 rounded-xl font-bold text-white transition ${
              !selectedReason || isSubmitting
                ? "bg-panel2 text-mut cursor-not-allowed"
                : "bg-bad hover:opacity-90"
            }`}
          >
            {isSubmitting ? "送信中..." : "通報する"}
          </button>
        </div>
      </div>
    </div>
  );
}
