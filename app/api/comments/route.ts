import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSpamContent, calculateSimilarity } from '@/lib/spam-filter';

// サーバー側でService Role Keyを使用（RLSをバイパス）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { 
      personId, 
      commentNumber,
      name,
      userId,
      voteType, 
      content,
      parentCommentId,
      userToken
    } = await request.json();

    // Validate required fields
    if (!personId || !voteType || !content || !userToken) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate user token format (64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(userToken)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user token' },
        { status: 400 }
      );
    }

    // 名前の文字数制限（50文字）
    if (name && name.length > 50) {
      return NextResponse.json(
        { success: false, error: '名前は50文字以内で入力してください' },
        { status: 400 }
      );
    }

    // 名前のスパム対策
    if (name && name.trim()) {
      const nameSpamCheck = isSpamContent(name);
      if (nameSpamCheck.isSpam) {
        return NextResponse.json(
          { success: false, error: `名前に不適切な内容が含まれています: ${nameSpamCheck.reason}` },
          { status: 400 }
        );
      }
    }

    // コンテンツのスパム対策
    const spamCheck = isSpamContent(content);
    if (spamCheck.isSpam) {
      return NextResponse.json(
        { success: false, error: `スパム対策: ${spamCheck.reason}` },
        { status: 400 }
      );
    }

    // スパム対策: 同じユーザーの過去1分以内のコメントをチェック
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentComments } = await supabaseAdmin
      .from('comments')
      .select('content, created_at')
      .eq('person_id', personId)
      .gte('created_at', oneMinuteAgo)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentComments && recentComments.length > 0) {
      // 完全一致チェック
      const duplicateComment = recentComments.find(c => c.content.trim() === content.trim());
      if (duplicateComment) {
        return NextResponse.json(
          { success: false, error: '同じ内容のコメントが既に投稿されています' },
          { status: 429 }
        );
      }

      // 類似コメントチェック（90%以上類似していたらスパム）
      for (const recentComment of recentComments) {
        const similarity = calculateSimilarity(recentComment.content, content);
        if (similarity >= 0.9) {
          return NextResponse.json(
            { success: false, error: '類似したコメントが既に投稿されています' },
            { status: 429 }
          );
        }
      }

      // 1分以内に3件以上投稿している場合は制限
      if (recentComments.length >= 3) {
        return NextResponse.json(
          { success: false, error: '投稿が多すぎます。少し時間をおいてから再度お試しください' },
          { status: 429 }
        );
      }
    }

    // Insert comment into database (using Service Role Key)
    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert({
        person_id: personId,
        comment_number: commentNumber,
        name: name || null,
        user_id: userId || null,
        vote_type: voteType,
        content: content,
        parent_comment_id: parentCommentId || null,
        good_count: 0,
        bad_count: 0,
        is_hidden: false,
        is_reported: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Comment insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, comment: data });
  } catch (error) {
    console.error('Comment API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
