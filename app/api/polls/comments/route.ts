import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { isSpamContent, calculateSimilarity } from '@/lib/spam-filter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { 
      pollId,
      commentNumber,
      name,
      userId,
      content,
      parentCommentId,
      userToken
    } = await request.json();

    if (!pollId || !content || !userToken) {
      return NextResponse.json(
        { success: false, error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    if (!/^[a-f0-9]{64}$/i.test(userToken)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user token' },
        { status: 400 }
      );
    }

    if (name && name.length > 50) {
      return NextResponse.json(
        { success: false, error: '名前は50文字以内で入力してください' },
        { status: 400 }
      );
    }

    if (name && name.trim()) {
      const nameSpamCheck = isSpamContent(name);
      if (nameSpamCheck.isSpam) {
        return NextResponse.json(
          { success: false, error: `名前に不適切な内容が含まれています: ${nameSpamCheck.reason}` },
          { status: 400 }
        );
      }
    }

    const spamCheck = isSpamContent(content);
    if (spamCheck.isSpam) {
      return NextResponse.json(
        { success: false, error: `スパム対策: ${spamCheck.reason}` },
        { status: 400 }
      );
    }

    // 連投チェック
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentUserComments } = await supabaseAdmin
      .from('poll_comments')
      .select('content, created_at')
      .eq('cookie_id', userToken)
      .gte('created_at', oneMinuteAgo)
      .order('created_at', { ascending: false });

    if (recentUserComments && recentUserComments.length >= 2) {
      return NextResponse.json(
        { success: false, error: 'コメントの投稿が早すぎます。1分以上間隔をあけてください' },
        { status: 429 }
      );
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: tenMinCount } = await supabaseAdmin
      .from('poll_comments')
      .select('id', { count: 'exact', head: true })
      .eq('cookie_id', userToken)
      .gte('created_at', tenMinutesAgo);

    if (tenMinCount && tenMinCount >= 5) {
      return NextResponse.json(
        { success: false, error: '投稿が多すぎます。しばらく時間をおいてから再度お試しください' },
        { status: 429 }
      );
    }

    // 重複チェック
    const { data: allUserComments } = await supabaseAdmin
      .from('poll_comments')
      .select('content')
      .eq('cookie_id', userToken)
      .eq('poll_id', pollId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (allUserComments) {
      const duplicateComment = allUserComments.find(c => c.content.trim() === content.trim());
      if (duplicateComment) {
        return NextResponse.json(
          { success: false, error: '同じ内容のコメントが既に投稿されています' },
          { status: 429 }
        );
      }

      for (const userComment of allUserComments) {
        const similarity = calculateSimilarity(userComment.content, content);
        if (similarity >= 0.9) {
          return NextResponse.json(
            { success: false, error: '類似したコメントが既に投稿されています' },
            { status: 429 }
          );
        }
      }
    }

    // コメントを挿入
    const { data, error } = await supabaseAdmin
      .from('poll_comments')
      .insert({
        poll_id: pollId,
        comment_number: commentNumber,
        name: name || null,
        user_id: userId || null,
        content: content,
        parent_comment_id: parentCommentId || null,
        good_count: 0,
        bad_count: 0,
        is_hidden: false,
        is_reported: false,
        cookie_id: userToken,
      })
      .select()
      .single();

    if (error) {
      console.error('Poll comment insert error:', error);
      return NextResponse.json(
        { success: false, error: 'コメントの保存に失敗しました' },
        { status: 500 }
      );
    }

    revalidatePath(`/polls/${pollId}`);

    return NextResponse.json({ success: true, comment: data });
  } catch (error) {
    console.error('Poll comment API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
