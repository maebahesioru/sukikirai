'use client';

import { Twitter, Share2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

type ShareButtonsProps = {
  personName: string;
  voteType: 'like' | 'dislike';
  likeCount: number;
  dislikeCount: number;
};

export default function ShareButtons({ personName, voteType, likeCount, dislikeCount }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const totalVotes = likeCount + dislikeCount;
  const likePercentage = totalVotes > 0 ? Math.round((likeCount / totalVotes) * 100) : 0;
  const dislikePercentage = totalVotes > 0 ? 100 - likePercentage : 0;
  
  const shareText = `【${voteType === 'like' ? '好き派' : '嫌い派'}】に投票しました！\n\n#${personName} のこと好き？嫌い？\n【好き派】${likePercentage}% vs【嫌い派】${dislikePercentage}%\n\n#ヒカマーズ好き嫌いcom`;

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleBlueskyShare = () => {
    const blueskyUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText + ' ' + currentUrl)}`;
    window.open(blueskyUrl, '_blank');
  };

  const handleLineShare = () => {
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText + ' ' + currentUrl)}`;
    window.open(lineUrl, '_blank');
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h3 className="text-lg font-bold mb-4 text-gray-800">投票結果をシェア</h3>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleTwitterShare}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
        >
          <Twitter className="w-5 h-5" />
          X (Twitter)
        </button>
        <button
          onClick={handleBlueskyShare}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          <Share2 className="w-5 h-5" />
          Bluesky
        </button>
        <button
          onClick={handleLineShare}
          className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
        >
          <Share2 className="w-5 h-5" />
          LINE
        </button>
        <button
          onClick={handleCopyUrl}
          className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
        >
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          {copied ? 'コピー完了！' : 'URLコピー'}
        </button>
      </div>
    </div>
  );
}
