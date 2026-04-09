'use client';

import { Twitter, Share2, Copy, Check, Facebook, Bookmark, MessageCircle } from 'lucide-react';
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

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank');
  };

  const handleHatenaBookmarkShare = () => {
    const hatenaUrl = `https://b.hatena.ne.jp/entry/panel/?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(shareText)}`;
    window.open(hatenaUrl, '_blank');
  };

  const handleMastodonShare = () => {
    const mastodonText = encodeURIComponent(shareText);
    const mastodonUrl = encodeURIComponent(currentUrl);
    // ユーザー指定の技術を使用：ポップアップウィンドウでシェア
    const shareUrl = `https://donshare.net/share.html?text=${mastodonText}&url=${mastodonUrl}`;
    window.open(shareUrl, 'mastodon-share', 'width=500,height=400');
  };

  const handleMisskeyShare = () => {
    const mastodonText = encodeURIComponent(shareText);
    const mastodonUrl = encodeURIComponent(currentUrl);
    // ユーザー指定の技術を使用：misskeyshare.linkを使用
    const shareUrl = `https://misskeyshare.link/share.html?text=${mastodonText}&url=${mastodonUrl}`;
    window.open(shareUrl, 'misskey-share', 'width=500,height=400');
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
          onClick={handleFacebookShare}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Facebook className="w-5 h-5" />
          Facebook
        </button>
        <button
          onClick={handleHatenaBookmarkShare}
          className="flex items-center gap-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition"
        >
          <Bookmark className="w-5 h-5" />
          はてブ
        </button>
        <button
          onClick={handleMastodonShare}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          <MessageCircle className="w-5 h-5" />
          Mastodon
        </button>
        <button
          onClick={handleMisskeyShare}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <MessageCircle className="w-5 h-5" />
          Misskey
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
