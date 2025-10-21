'use client';

import { useState } from 'react';
import Cookies from 'js-cookie';

type TermsAgreementModalProps = {
  onAgree: () => void;
};

export default function TermsAgreementModal({ onAgree }: TermsAgreementModalProps) {
  const [isAgreeing, setIsAgreeing] = useState(false);

  const handleAgree = async () => {
    setIsAgreeing(true);

    try {
      const response = await fetch('/api/agree-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!data.success) {
        alert('エラーが発生しました。ページをリロードして再度お試しください。');
        setIsAgreeing(false);
        return;
      }

      // Save user token to cookie
      Cookies.set('user_token', data.userToken, { 
        expires: new Date(data.expiresAt),
        sameSite: 'strict'
      });

      onAgree();
    } catch (error) {
      console.error('Terms agreement error:', error);
      alert('エラーが発生しました。');
      setIsAgreeing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">利用規約への同意</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3">ヒカマーズ好き嫌い.com 利用規約</h3>
            
            <div className="space-y-4 text-sm text-gray-700">
              <section>
                <h4 className="font-bold mb-2">第1条（適用）</h4>
                <p>本規約は、本サービスの利用に関する条件を定めるものです。ユーザーは、本規約に同意した上で本サービスを利用するものとします。</p>
              </section>

              <section>
                <h4 className="font-bold mb-2">第2条（禁止事項）</h4>
                <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>法令または公序良俗に違反する行為</li>
                  <li>犯罪行為に関連する行為</li>
                  <li>他のユーザーまたは第三者の権利を侵害する行為</li>
                  <li>誹謗中傷、嫌がらせ、脅迫等の行為</li>
                  <li>本サービスの運営を妨害する行為</li>
                  <li>不正アクセス、またはこれを試みる行為</li>
                  <li>スパム行為、荒らし行為</li>
                  <li>自動化ツール等を使用した不正な投稿</li>
                </ul>
              </section>

              <section>
                <h4 className="font-bold mb-2">第3条（投稿コンテンツ）</h4>
                <p>ユーザーが投稿したコメント等のコンテンツに関する責任は、投稿したユーザー自身が負うものとします。運営者は、投稿内容について一切の責任を負いません。</p>
              </section>

              <section>
                <h4 className="font-bold mb-2">第4条（コンテンツの削除）</h4>
                <p>運営者は、ユーザーが投稿したコンテンツが本規約に違反すると判断した場合、事前の通知なく当該コンテンツを削除できるものとします。</p>
              </section>

              <section>
                <h4 className="font-bold mb-2">第5条（免責事項）</h4>
                <p>本サービスの利用により生じた損害について、運営者は一切の責任を負いません。</p>
              </section>

              <section>
                <h4 className="font-bold mb-2">第6条（利用制限）</h4>
                <p>運営者は、本規約に違反したユーザーに対して、事前の通知なく本サービスの利用を制限できるものとします。</p>
              </section>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-700 mb-4">
              上記の利用規約をお読みいただき、同意される場合は「同意する」ボタンをクリックしてください。
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAgree}
              disabled={isAgreeing}
              className={`flex-1 py-3 px-6 rounded-lg font-bold text-white transition ${
                isAgreeing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90'
              }`}
            >
              {isAgreeing ? '処理中...' : '同意する'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            ※同意することで、1年間サービスをご利用いただけます
          </p>
        </div>
      </div>
    </div>
  );
}
