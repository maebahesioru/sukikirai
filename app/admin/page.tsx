'use client';

import { useState, useEffect } from 'react';
import { Shield, Trash2, AlertCircle } from 'lucide-react';
import { supabase, type Comment, type Report } from '@/lib/supabase';
import { format } from 'date-fns';

const ADMIN_PASSWORD = '6WH_CkHKnsWy';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reports, setReports] = useState<(Report & { comment: Comment })[]>([]);
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [activeTab, setActiveTab] = useState<'reports' | 'comments' | 'votes'>('reports');

  useEffect(() => {
    // Check if already logged in
    const savedAuth = localStorage.getItem('adminAuthenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
      fetchAllComments();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      setPassword('');
    } else {
      alert('パスワードが間違っています');
    }
  };

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      setIsAuthenticated(false);
      localStorage.removeItem('adminAuthenticated');
    }
  };

  const fetchReports = async () => {
    const { data: reportsData } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (reportsData) {
      const reportsWithComments = await Promise.all(
        reportsData.map(async (report) => {
          const { data: comment } = await supabase
            .from('comments')
            .select('*')
            .eq('id', report.comment_id)
            .single();

          return {
            ...report,
            comment: comment!,
          };
        })
      );
      // Filter out reports with deleted or hidden comments
      setReports(reportsWithComments.filter((r) => r.comment && !r.comment.is_hidden));
    }
  };

  const fetchAllComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('is_hidden', false)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false });

    if (data) {
      setAllComments(data);
    }
  };

  const handleDeleteComment = async (commentId: string, reportId?: string) => {
    if (!confirm('このコメントを削除しますか？\n\n※削除後、ページがリロードされます')) return;

    try {
      // Step 1: Delete all reports for this comment and its replies
      const { data: childComments } = await supabase
        .from('comments')
        .select('id')
        .eq('parent_comment_id', commentId);
      
      const commentIds = [commentId, ...(childComments?.map(c => c.id) || [])];
      
      await supabase
        .from('reports')
        .delete()
        .in('comment_id', commentIds);

      // Step 2: Delete child comments (replies)
      const { error: repliesError } = await supabase
        .from('comments')
        .delete()
        .eq('parent_comment_id', commentId);
      
      if (repliesError) {
        console.error('返信削除エラー:', repliesError);
        throw repliesError;
      }

      // Step 3: Delete the parent comment itself
      const { error: commentError } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (commentError) {
        console.error('コメント削除エラー:', commentError);
        throw commentError;
      }

      // Step 4: Delete the specific report if reportId is provided
      if (reportId) {
        await supabase
          .from('reports')
          .delete()
          .eq('id', reportId);
      }
      
      alert('コメントを削除しました\n\nページをリロードします');
      // Force page reload to ensure changes are reflected
      window.location.reload();
    } catch (error) {
      console.error('削除エラー:', error);
      alert(`削除に失敗しました\n\nエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const handleHideComment = async (commentId: string, reportId?: string) => {
    if (!confirm('このコメントを非表示にしますか？\n\n※非表示後、ページがリロードされます')) return;

    try {
      const { error: commentError } = await supabase
        .from('comments')
        .update({ is_hidden: true })
        .eq('id', commentId);

      if (commentError) throw commentError;

      // Delete the report after hiding the comment
      if (reportId) {
        await supabase
          .from('reports')
          .delete()
          .eq('id', reportId);
      } else {
        // Delete all reports for this comment
        await supabase
          .from('reports')
          .delete()
          .eq('comment_id', commentId);
      }
      
      alert('コメントを非表示にしました\n\nページをリロードします');
      window.location.reload();
    } catch (error) {
      console.error('非表示エラー:', error);
      alert('非表示に失敗しました');
    }
  };

  const handleDismissReport = async (reportId: string) => {
    if (!confirm('この通報を却下しますか？')) return;

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      alert('通報を却下しました');
      fetchReports();
    } catch (error) {
      console.error('却下エラー:', error);
      alert('却下に失敗しました');
    }
  };

  const handleModifyVotes = async (personId: string, likeCount: number, dislikeCount: number) => {
    if (!confirm(`票数を変更しますか？\n\n好き: ${likeCount}票\n嫌い: ${dislikeCount}票`)) return;

    try {
      // Delete existing votes for this person
      await supabase
        .from('votes')
        .delete()
        .eq('person_id', personId);

      // Insert new votes
      const votes = [];
      for (let i = 0; i < likeCount; i++) {
        votes.push({
          person_id: personId,
          vote_type: 'like',
          cookie_id: `admin_like_${i}_${Date.now()}`,
          ip_address: 'admin_modified',
        });
      }
      for (let i = 0; i < dislikeCount; i++) {
        votes.push({
          person_id: personId,
          vote_type: 'dislike',
          cookie_id: `admin_dislike_${i}_${Date.now()}`,
          ip_address: 'admin_modified',
        });
      }

      const { error } = await supabase.from('votes').insert(votes);

      if (error) throw error;

      alert('票数を変更しました\n\nページをリロードします');
      window.location.reload();
    } catch (error) {
      console.error('票数変更エラー:', error);
      alert('票数の変更に失敗しました');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-12 h-12 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
            管理者コントロールパネル
          </h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-purple-700 transition"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-purple-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <h1 className="text-2xl font-bold">管理者コントロールパネル</h1>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex-1 py-4 px-6 font-bold transition ${
                activeTab === 'reports'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              通報管理 ({reports.length})
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`flex-1 py-4 px-6 font-bold transition ${
                activeTab === 'comments'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              コメント削除
            </button>
            <button
              onClick={() => setActiveTab('votes')}
              className={`flex-1 py-4 px-6 font-bold transition ${
                activeTab === 'votes'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              票数管理
            </button>
          </div>
        </div>

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {reports.length > 0 ? (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500"
                >
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">
                            通報日時: {format(new Date(report.created_at), 'yyyy-MM-dd HH:mm:ss')}
                          </p>
                          <p className="text-sm text-gray-700">
                            理由: {report.reason || '不明'}
                          </p>
                        </div>
                      </div>

                      {/* Comment Details */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold">
                            #{report.comment.comment_number}
                          </span>
                          <span className="text-sm">{report.comment.name || '匿名'}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              report.comment.vote_type === 'like'
                                ? 'bg-pink-100 text-pink-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            @{report.comment.vote_type === 'like' ? '好き派' : '嫌い派'}
                          </span>
                        </div>
                        <p className="text-gray-800">{report.comment.content}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleDeleteComment(report.comment.id, report.id)}
                          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                          コメント削除
                        </button>
                        <button
                          onClick={() => handleHideComment(report.comment.id, report.id)}
                          className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition"
                        >
                          非表示にする
                        </button>
                        <button
                          onClick={() => handleDismissReport(report.id)}
                          className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
                        >
                          通報を却下
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <p className="text-gray-600">通報はありません</p>
              </div>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {allComments.length > 0 ? (
              allComments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white rounded-lg shadow-lg p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-500">
                        #{comment.comment_number}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {comment.name || '匿名'}
                      </span>
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
                    <span className="text-xs text-gray-500">
                      {format(new Date(comment.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </span>
                  </div>
                  <p className="text-gray-800 mb-4">{comment.content}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">グッド: {comment.good_count}</span>
                    <span className="text-sm text-gray-600">バッド: {comment.bad_count}</span>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      削除
                    </button>
                    <button
                      onClick={() => handleHideComment(comment.id)}
                      className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition"
                    >
                      非表示にする
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <p className="text-gray-600">コメントはありません</p>
              </div>
            )}
          </div>
        )}

        {/* Votes Tab */}
        {activeTab === 'votes' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">票数管理</h2>
            <p className="text-sm text-gray-600 mb-6">
              人物IDを入力して、好き/嫌いの票数を設定できます。
            </p>
            <VoteManagementForm onSubmit={handleModifyVotes} />
          </div>
        )}
      </main>
    </div>
  );
}

function VoteManagementForm({ onSubmit }: { onSubmit: (personId: string, likeCount: number, dislikeCount: number) => void }) {
  const [personId, setPersonId] = useState('');
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId.trim()) {
      alert('人物IDを入力してください');
      return;
    }
    if (likeCount < 0 || dislikeCount < 0) {
      alert('票数は0以上で入力してください');
      return;
    }
    onSubmit(personId, likeCount, dislikeCount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          人物ID
        </label>
        <input
          type="text"
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          placeholder="例: jujika"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-500"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            好き票数
          </label>
          <input
            type="number"
            min="0"
            value={likeCount}
            onChange={(e) => setLikeCount(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            嫌い票数
          </label>
          <input
            type="number"
            min="0"
            value={dislikeCount}
            onChange={(e) => setDislikeCount(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            required
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-purple-700 transition"
      >
        票数を変更
      </button>
    </form>
  );
}
