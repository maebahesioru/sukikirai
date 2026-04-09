import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { isSpamContent } from '@/lib/spam-filter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { pollId, optionText, userToken } = await request.json();

    if (!pollId || !optionText || !userToken) {
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

    // 投票トークの情報を取得
    const { data: poll, error: pollError } = await supabaseAdmin
      .from('polls')
      .select('poll_type, creator_cookie_id')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json(
        { success: false, error: '投票が見つかりません' },
        { status: 404 }
      );
    }

    // 選択肢追加可能な投票タイプかチェック
    if (poll.poll_type !== 'three_plus_open') {
      return NextResponse.json(
        { success: false, error: 'この投票では選択肢を追加できません' },
        { status: 400 }
      );
    }

    // 投稿者は選択肢を追加できない
    if (poll.creator_cookie_id === userToken) {
      return NextResponse.json(
        { success: false, error: '投稿者は選択肢を追加できません' },
        { status: 400 }
      );
    }

    // スパムチェック
    const spamCheck = isSpamContent(optionText);
    if (spamCheck.isSpam) {
      return NextResponse.json(
        { success: false, error: `不適切な内容が含まれています: ${spamCheck.reason}` },
        { status: 400 }
      );
    }

    // 既存の選択肢数を取得
    const { count } = await supabaseAdmin
      .from('poll_options')
      .select('id', { count: 'exact', head: true })
      .eq('poll_id', pollId);

    if (count && count >= 20) {
      return NextResponse.json(
        { success: false, error: '選択肢は最大20個までです' },
        { status: 400 }
      );
    }

    // 同じユーザーが追加した選択肢数をチェック
    const { count: userOptionCount } = await supabaseAdmin
      .from('poll_options')
      .select('id', { count: 'exact', head: true })
      .eq('poll_id', pollId)
      .eq('created_by_cookie_id', userToken);

    if (userOptionCount && userOptionCount >= 3) {
      return NextResponse.json(
        { success: false, error: '1つの投票に追加できる選択肢は3つまでです' },
        { status: 400 }
      );
    }

    // 選択肢を追加
    const { data: newOption, error: optionError } = await supabaseAdmin
      .from('poll_options')
      .insert({
        poll_id: pollId,
        option_text: optionText,
        option_order: count || 0,
        vote_count: 0,
        created_by_creator: false,
        created_by_cookie_id: userToken,
      })
      .select()
      .single();

    if (optionError || !newOption) {
      console.error('Poll option insert error:', optionError);
      return NextResponse.json(
        { success: false, error: '選択肢の追加に失敗しました' },
        { status: 500 }
      );
    }

    revalidatePath(`/polls/${pollId}`);

    return NextResponse.json({ success: true, option: newOption });
  } catch (error) {
    console.error('Add poll option API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
