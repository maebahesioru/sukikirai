'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, ThumbsUp, ThumbsDown, Flag, EyeOff } from 'lucide-react';
import { supabase, type Comment } from '@/lib/supabase';
import { Turnstile } from '@marsidev/react-turnstile';
import { format } from 'date-fns';

type CommentSectionProps = {
  personId: string;
  hasVoted: boolean;
};

type FilterType = 'all' | 'like' | 'dislike';

export default function CommentSection({ personId, hasVoted }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [hiddenComments, setHiddenComments] = useState<string[]>([]);
  const [hiddenCommentData, setHiddenCommentData] = useState<Comment[]>([]);
  const [showHiddenComments, setShowHiddenComments] = useState(false);
  const commentsPerPage = 20;

  useEffect(() => {
    // Load hidden comments from localStorage
    const hidden = JSON.parse(localStorage.getItem('hiddenComments') || '[]');
    setHiddenComments(hidden);
  }, []);

  const fetchComments = useCallback(async () => {
    let query = supabase
      .from('comments')
      .select('*', { count: 'exact' })
      .eq('person_id', personId)
      .eq('is_hidden', false)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .range((page - 1) * commentsPerPage, page * commentsPerPage - 1);

    if (filter !== 'all') {
      query = query.eq('vote_type', filter);
    }

    const { data, count, error } = await query;

    if (!error && data) {
      // Filter out hidden comments
      const filteredData = data.filter(c => !hiddenComments.includes(c.id));
      setComments(filteredData);
      setTotalComments(count || 0);
      
      // Get hidden comments data
      const hiddenData = data.filter(c => hiddenComments.includes(c.id));
      setHiddenCommentData(hiddenData);
    }
  }, [personId, filter, page, hiddenComments]);

  const handleUnhide = (commentId: string) => {
    const hidden = JSON.parse(localStorage.getItem('hiddenComments') || '[]');
    const updated = hidden.filter((id: string) => id !== commentId);
    localStorage.setItem('hiddenComments', JSON.stringify(updated));
    setHiddenComments(updated);
  };

  const handleClearAllHidden = () => {
    if (confirm('すべての非表示コメントを再表示しますか？')) {
      localStorage.setItem('hiddenComments', JSON.stringify([]));
      setHiddenComments([]);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const totalPages = Math.ceil(totalComments / commentsPerPage);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800">
          コメント ({totalComments})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            すべて表示
          </button>
          <button
            onClick={() => setFilter('like')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'like'
                ? 'bg-pink-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            好き派のみ
          </button>
          <button
            onClick={() => setFilter('dislike')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'dislike'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            嫌い派のみ
          </button>
        </div>
      </div>

      {!hasVoted && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-center">
            コメントを見るには、まず投票してください
          </p>
        </div>
      )}

      {hasVoted && (
        <>
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                onHide={(id) => {
                  setHiddenComments([...hiddenComments, id]);
                  fetchComments();
                }}
                onUpdate={fetchComments}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
              >
                前へ
              </button>
              <span className="px-4 py-2 text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
              >
                次へ
              </button>
            </div>
          )}

          {/* Hidden Comments Section */}
          {hiddenComments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowHiddenComments(!showHiddenComments)}
                  className="text-lg font-bold text-gray-800 hover:text-purple-600 transition flex items-center gap-2"
                >
                  <EyeOff className="w-5 h-5" />
                  非表示中のコメント ({hiddenComments.length}件)
                  <span className="text-sm">{showHiddenComments ? '▼' : '▶'}</span>
                </button>
                <button
                  onClick={handleClearAllHidden}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
                >
                  すべて再表示
                </button>
              </div>

              {showHiddenComments && (
                <div className="space-y-3">
                  {hiddenCommentData.map((comment) => (
                    <div key={comment.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm text-gray-500">#{comment.comment_number}</span>
                          <span className="font-medium text-gray-800">{comment.name || '匿名'}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              comment.vote_type === 'like'
                                ? 'bg-pink-100 text-pink-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            @{comment.vote_type === 'like' ? '好き派' : '嫌い派'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUnhide(comment.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition flex items-center gap-1"
                        >
                          <EyeOff className="w-3 h-3" />
                          再表示
                        </button>
                      </div>
                      <p className="text-gray-600 text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CommentItem({ comment, onHide, onUpdate }: { comment: Comment; onHide: (id: string) => void; onUpdate: () => void }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [localComment, setLocalComment] = useState(comment);
  const [hasVoted, setHasVoted] = useState<'good' | 'bad' | null>(null);

  useEffect(() => {
    setLocalComment(comment);
    
    // Check if user has already voted on this comment
    const votedComments = JSON.parse(localStorage.getItem('votedComments') || '{}');
    if (votedComments[comment.id]) {
      setHasVoted(votedComments[comment.id]);
    }
  }, [comment]);

  useEffect(() => {
    fetchReplies();
  }, [comment.id]);

  const fetchReplies = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_comment_id', comment.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });

    if (data) {
      // Filter out locally hidden replies
      const hidden = JSON.parse(localStorage.getItem('hiddenComments') || '[]');
      const filteredData = data.filter(r => !hidden.includes(r.id));
      setReplies(filteredData);
    }
  };

  const handleGoodBad = async (type: 'good' | 'bad') => {
    const field = type === 'good' ? 'good_count' : 'bad_count';
    
    // If clicking the same button again, cancel the vote
    if (hasVoted === type) {
      const newValue = Math.max(0, localComment[field] - 1);
      
      await supabase
        .from('comments')
        .update({ [field]: newValue })
        .eq('id', comment.id);
      
      // Update local state
      setLocalComment({ ...localComment, [field]: newValue });
      
      // Remove from localStorage
      const votedComments = JSON.parse(localStorage.getItem('votedComments') || '{}');
      delete votedComments[comment.id];
      localStorage.setItem('votedComments', JSON.stringify(votedComments));
      setHasVoted(null);
      return;
    }
    
    // If already voted for the opposite, prevent changing vote
    if (hasVoted) {
      alert('評価を変更する場合は、先に現在の評価を取り消してください');
      return;
    }

    // Add new vote
    const newValue = localComment[field] + 1;
    
    await supabase
      .from('comments')
      .update({ [field]: newValue })
      .eq('id', comment.id);
    
    // Update local state
    setLocalComment({ ...localComment, [field]: newValue });
    
    // Save to localStorage
    const votedComments = JSON.parse(localStorage.getItem('votedComments') || '{}');
    votedComments[comment.id] = type;
    localStorage.setItem('votedComments', JSON.stringify(votedComments));
    setHasVoted(type);
  };

  const handleReport = async () => {
    if (!confirm('このコメントを通報しますか？\n\n不適切な内容や規約違反のコメントを通報できます。')) {
      return;
    }
    
    const { error } = await supabase.from('reports').insert({
      comment_id: comment.id,
      reason: 'ユーザー通報',
    });
    
    if (error) {
      alert('通報に失敗しました');
      console.error('通報エラー:', error);
    } else {
      alert('通報を受け付けました。\n\nご協力ありがとうございます。');
    }
  };

  const handleHide = () => {
    // LocalStorageに隠すコメントのIDを保存
    const hidden = JSON.parse(localStorage.getItem('hiddenComments') || '[]');
    hidden.push(comment.id);
    localStorage.setItem('hiddenComments', JSON.stringify(hidden));
    onHide(comment.id);
    alert('コメントを非表示にしました');
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">#{comment.comment_number}</span>
          <span className="font-medium text-gray-800">{comment.name || '匿名'}</span>
          <span
            className={`text-xs px-2 py-1 rounded ${
              comment.vote_type === 'like'
                ? 'bg-pink-100 text-pink-700'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            @{comment.vote_type === 'like' ? '好き派' : '嫌い派'}
          </span>
          <span className="text-xs text-gray-500">
            {format(new Date(comment.created_at), 'yyyy-MM-dd HH:mm:ss')}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReport}
            className="text-gray-500 hover:text-red-500 transition"
            title="通報"
          >
            <Flag className="w-4 h-4" />
          </button>
          <button
            onClick={handleHide}
            className="text-gray-500 hover:text-gray-700 transition"
            title="非表示"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-gray-800 mb-3">{comment.content}</p>

      <div className="flex items-center gap-4">
        <button
          onClick={() => handleGoodBad('good')}
          disabled={hasVoted !== null && hasVoted !== 'good'}
          className={`flex items-center gap-1 text-sm transition ${
            hasVoted === 'good'
              ? 'text-green-600 font-bold cursor-pointer hover:text-green-700'
              : hasVoted
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-green-600'
          }`}
          title={hasVoted === 'good' ? 'クリックで評価を解除' : hasVoted ? '既に評価済みです' : 'グッド'}
        >
          <ThumbsUp className="w-4 h-4" />
          {localComment.good_count}
        </button>
        <button
          onClick={() => handleGoodBad('bad')}
          disabled={hasVoted !== null && hasVoted !== 'bad'}
          className={`flex items-center gap-1 text-sm transition ${
            hasVoted === 'bad'
              ? 'text-red-600 font-bold cursor-pointer hover:text-red-700'
              : hasVoted
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-red-600'
          }`}
          title={hasVoted === 'bad' ? 'クリックで評価を解除' : hasVoted ? '既に評価済みです' : 'バッド'}
        >
          <ThumbsDown className="w-4 h-4" />
          {localComment.bad_count}
        </button>
        <button
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition"
        >
          <MessageCircle className="w-4 h-4" />
          返信
        </button>
      </div>

      {/* Reply Form */}
      {showReplyForm && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-bold text-gray-700 mb-3">
            &gt;&gt;{comment.comment_number} への返信
          </h4>
          <ReplyForm
            personId={comment.person_id}
            parentCommentId={comment.id}
            parentCommentNumber={comment.comment_number}
            onReplyPosted={() => {
              setShowReplyForm(false);
              fetchReplies();
              onUpdate();
            }}
          />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-4 pl-6 border-l-2 border-gray-300 space-y-3">
          {replies.map((reply) => (
            <ReplyItem 
              key={reply.id} 
              reply={reply} 
              parentCommentNumber={comment.comment_number}
              onUpdate={fetchReplies}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Reply Item Component
function ReplyItem({ 
  reply, 
  parentCommentNumber,
  onUpdate 
}: { 
  reply: Comment; 
  parentCommentNumber: number;
  onUpdate: () => void;
}) {
  const [localReply, setLocalReply] = useState(reply);
  const [hasVoted, setHasVoted] = useState<'good' | 'bad' | null>(null);

  useEffect(() => {
    setLocalReply(reply);
    
    // Check if user has already voted on this reply
    const votedComments = JSON.parse(localStorage.getItem('votedComments') || '{}');
    if (votedComments[reply.id]) {
      setHasVoted(votedComments[reply.id]);
    }
  }, [reply]);

  const handleGoodBad = async (type: 'good' | 'bad') => {
    const field = type === 'good' ? 'good_count' : 'bad_count';
    
    // If clicking the same button again, cancel the vote
    if (hasVoted === type) {
      const newValue = Math.max(0, localReply[field] - 1);
      
      await supabase
        .from('comments')
        .update({ [field]: newValue })
        .eq('id', reply.id);
      
      setLocalReply({ ...localReply, [field]: newValue });
      
      const votedComments = JSON.parse(localStorage.getItem('votedComments') || '{}');
      delete votedComments[reply.id];
      localStorage.setItem('votedComments', JSON.stringify(votedComments));
      setHasVoted(null);
      return;
    }
    
    if (hasVoted) {
      alert('評価を変更する場合は、先に現在の評価を取り消してください');
      return;
    }

    const newValue = localReply[field] + 1;
    
    await supabase
      .from('comments')
      .update({ [field]: newValue })
      .eq('id', reply.id);
    
    setLocalReply({ ...localReply, [field]: newValue });
    
    const votedComments = JSON.parse(localStorage.getItem('votedComments') || '{}');
    votedComments[reply.id] = type;
    localStorage.setItem('votedComments', JSON.stringify(votedComments));
    setHasVoted(type);
  };

  const handleReport = async () => {
    if (!confirm('この返信を通報しますか？\n\n不適切な内容や規約違反のコメントを通報できます。')) {
      return;
    }
    
    const { error } = await supabase.from('reports').insert({
      comment_id: reply.id,
      reason: 'ユーザー通報',
    });
    
    if (error) {
      alert('通報に失敗しました');
      console.error('通報エラー:', error);
    } else {
      alert('通報を受け付けました。\n\nご協力ありがとうございます。');
    }
  };

  const handleHide = () => {
    const hidden = JSON.parse(localStorage.getItem('hiddenComments') || '[]');
    hidden.push(reply.id);
    localStorage.setItem('hiddenComments', JSON.stringify(hidden));
    onUpdate();
    alert('返信を非表示にしました');
  };

  return (
    <div className="text-sm border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-500">&gt;&gt;{parentCommentNumber}</span>
          <span className="font-medium text-gray-800">{reply.name || '匿名'}</span>
          <span
            className={`text-xs px-2 py-1 rounded ${
              reply.vote_type === 'like'
                ? 'bg-pink-100 text-pink-700'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            @{reply.vote_type === 'like' ? '好き派' : '嫌い派'}
          </span>
          <span className="text-xs text-gray-500">
            {format(new Date(reply.created_at), 'yyyy-MM-dd HH:mm:ss')}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReport}
            className="text-gray-500 hover:text-red-500 transition"
            title="通報"
          >
            <Flag className="w-3 h-3" />
          </button>
          <button
            onClick={handleHide}
            className="text-gray-500 hover:text-gray-700 transition"
            title="非表示"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>

      <p className="text-gray-700 mb-2">{reply.content}</p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => handleGoodBad('good')}
          disabled={hasVoted !== null && hasVoted !== 'good'}
          className={`flex items-center gap-1 text-xs transition ${
            hasVoted === 'good'
              ? 'text-green-600 font-bold cursor-pointer hover:text-green-700'
              : hasVoted
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-green-600'
          }`}
          title={hasVoted === 'good' ? 'クリックで評価を解除' : hasVoted ? '既に評価済みです' : 'グッド'}
        >
          <ThumbsUp className="w-3 h-3" />
          {localReply.good_count}
        </button>
        <button
          onClick={() => handleGoodBad('bad')}
          disabled={hasVoted !== null && hasVoted !== 'bad'}
          className={`flex items-center gap-1 text-xs transition ${
            hasVoted === 'bad'
              ? 'text-red-600 font-bold cursor-pointer hover:text-red-700'
              : hasVoted
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:text-red-600'
          }`}
          title={hasVoted === 'bad' ? 'クリックで評価を解除' : hasVoted ? '既に評価済みです' : 'バッド'}
        >
          <ThumbsDown className="w-3 h-3" />
          {localReply.bad_count}
        </button>
      </div>
    </div>
  );
}

// Reply Form Component
function ReplyForm({
  personId,
  parentCommentId,
  parentCommentNumber,
  onReplyPosted,
}: {
  personId: string;
  parentCommentId: string;
  parentCommentNumber: number;
  onReplyPosted: () => void;
}) {
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [content, setContent] = useState(`>>${parentCommentNumber}\n`);
  const [selectedVoteType, setSelectedVoteType] = useState<'like' | 'dislike'>('like');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);
  
  const MAX_CHARS = 280;

  // 全角文字を2、半角文字を1としてカウント
  const getCharCount = (text: string): number => {
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      count += charCode <= 0x7F ? 1 : 2;
    }
    return count;
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const charCount = getCharCount(newContent);
    
    if (charCount <= MAX_CHARS) {
      setContent(newContent);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const charCount = getCharCount(content);
    if (charCount > MAX_CHARS) {
      alert(`返信は全角${Math.floor(MAX_CHARS / 2)}文字（半角${MAX_CHARS}文字）以内で入力してください`);
      return;
    }

    if (!turnstileToken) {
      alert('認証が必要です。少々お待ちください。');
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Verify Turnstile token
      const verifyResponse = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.success) {
        alert('認証に失敗しました。ページをリロードして再度お試しください。');
        setIsSubmitting(false);
        return;
      }

      // Get next comment number
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('person_id', personId);

      const commentNumber = (count || 0) + 1;

      // Insert reply
      const { error } = await supabase.from('comments').insert({
        person_id: personId,
        parent_comment_id: parentCommentId,
        comment_number: commentNumber,
        name: name.trim() || null,
        user_id: userId.trim() || null,
        vote_type: selectedVoteType,
        content: content.trim(),
        good_count: 0,
        bad_count: 0,
        is_hidden: false,
        is_reported: false,
      });

      if (error) throw error;

      // Reset form and close
      setName('');
      setUserId('');
      setContent(`>>${parentCommentNumber}\n`);
      onReplyPosted();
    } catch (error) {
      console.error('返信投稿エラー:', error);
      alert('返信の投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="名前（任意）"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-500 text-sm"
        />
      </div>
      
      <div>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="ID（任意）"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-500 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSelectedVoteType('like')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition ${
            selectedVoteType === 'like'
              ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          好き派
        </button>
        <button
          type="button"
          onClick={() => setSelectedVoteType('dislike')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition ${
            selectedVoteType === 'dislike'
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          嫌い派
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-600">返信内容</label>
          <span className={`text-xs ${getCharCount(content) > MAX_CHARS ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
            {getCharCount(content)} / {MAX_CHARS}
          </span>
        </div>
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder={`>>${parentCommentNumber}\n返信内容を入力...`}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-500 text-sm"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          ※全角{Math.floor(MAX_CHARS / 2)}文字（半角{MAX_CHARS}文字）まで
        </p>
      </div>

      <div className="flex justify-center my-3">
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAB7zVyyT42WhDQqg'}
          onSuccess={(token) => setTurnstileToken(token)}
          onError={() => {
            alert('認証に失敗しました。ページをリロードしてください。');
          }}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !turnstileToken}
          className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
        >
          {isSubmitting ? '投稿中...' : '返信を投稿'}
        </button>
        <button
          type="button"
          onClick={onReplyPosted}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition text-sm"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
