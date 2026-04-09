import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { isSpamContent } from '@/lib/spam-filter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { 
      title,
      description,
      pollType,
      options,
      relatedPersonIds,
      userToken
    } = await request.json();

    if (!title || !pollType || !options || !Array.isArray(options) || !userToken) {
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

    // タイトルの検証
    if (title.length > 200) {
      return NextResponse.json(
        { success: false, error: 'タイトルは200文字以内で入力してください' },
        { status: 400 }
      );
    }

    const titleSpamCheck = isSpamContent(title);
    if (titleSpamCheck.isSpam) {
      return NextResponse.json(
        { success: false, error: `タイトルに不適切な内容が含まれています: ${titleSpamCheck.reason}` },
        { status: 400 }
      );
    }

    // 選択肢の検証
    if (pollType === 'two_choice' && options.length !== 2) {
      return NextResponse.json(
        { success: false, error: '2択の場合は選択肢を2つ指定してください' },
        { status: 400 }
      );
    }

    if ((pollType === 'three_plus_fixed' || pollType === 'three_plus_open') && options.length < 3) {
      return NextResponse.json(
        { success: false, error: '3択以上の場合は選択肢を3つ以上指定してください' },
        { status: 400 }
      );
    }

    // 投稿制限チェック
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('polls')
      .select('id', { count: 'exact', head: true })
      .eq('creator_cookie_id', userToken)
      .gte('created_at', oneHourAgo);

    if (count && count >= 3) {
      return NextResponse.json(
        { success: false, error: '1時間に作成できる投票は3つまでです' },
        { status: 429 }
      );
    }

    // 投票トークを作成
    const { data: poll, error: pollError } = await supabaseAdmin
      .from('polls')
      .insert({
        title,
        description: description || null,
        poll_type: pollType,
        creator_cookie_id: userToken,
        related_person_ids: relatedPersonIds || [],
        total_votes: 0,
        is_hidden: false,
      })
      .select()
      .single();

    if (pollError || !poll) {
      console.error('Poll insert error:', pollError);
      return NextResponse.json(
        { success: false, error: '投票の作成に失敗しました' },
        { status: 500 }
      );
    }

    // 選択肢を作成
    const pollOptions = options.map((option: string, index: number) => ({
      poll_id: poll.id,
      option_text: option,
      option_order: index,
      vote_count: 0,
      created_by_creator: true,
    }));

    const { error: optionsError } = await supabaseAdmin
      .from('poll_options')
      .insert(pollOptions);

    if (optionsError) {
      console.error('Poll options insert error:', optionsError);
      // ロールバック
      await supabaseAdmin.from('polls').delete().eq('id', poll.id);
      return NextResponse.json(
        { success: false, error: '選択肢の作成に失敗しました' },
        { status: 500 }
      );
    }

    // キャッシュ無効化
    revalidatePath('/polls');
    if (relatedPersonIds && relatedPersonIds.length > 0) {
      relatedPersonIds.forEach((personId: string) => {
        revalidatePath(`/person/${personId}`);
      });
    }

    return NextResponse.json({ success: true, pollId: poll.id });
  } catch (error) {
    console.error('Create poll API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
