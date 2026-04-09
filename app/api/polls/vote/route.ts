import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// reCAPTCHA検証関数
async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY is not set');
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { pollId, optionId, userToken, recaptchaToken } = await request.json();

    if (!pollId || !optionId || !userToken || !recaptchaToken) {
      return NextResponse.json(
        { success: false, error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    // reCAPTCHA検証
    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      return NextResponse.json(
        { success: false, error: 'reCAPTCHA認証に失敗しました。もう一度お試しください。' },
        { status: 400 }
      );
    }

    if (!/^[a-f0-9]{64}$/i.test(userToken)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user token' },
        { status: 400 }
      );
    }

    // 既に投票済みかチェック
    const { data: existingVote } = await supabaseAdmin
      .from('poll_votes')
      .select('id, option_id')
      .eq('poll_id', pollId)
      .eq('cookie_id', userToken)
      .single();

    if (existingVote) {
      return NextResponse.json(
        { success: false, error: '既に投票済みです', currentOptionId: existingVote.option_id },
        { status: 429 }
      );
    }

    // 投票を記録
    const { error: voteError } = await supabaseAdmin
      .from('poll_votes')
      .insert({
        poll_id: pollId,
        option_id: optionId,
        cookie_id: userToken,
      });

    if (voteError) {
      console.error('Poll vote insert error:', voteError);
      return NextResponse.json(
        { success: false, error: '投票の記録に失敗しました' },
        { status: 500 }
      );
    }

    // 選択肢の投票数を更新
    const { error: updateError } = await supabaseAdmin.rpc('increment_poll_option_votes', {
      option_id: optionId,
    });

    if (updateError) {
      console.error('Poll option vote count update error:', updateError);
    }

    // 投票トークの総投票数を更新
    const { error: totalUpdateError } = await supabaseAdmin.rpc('increment_poll_total_votes', {
      poll_id: pollId,
    });

    if (totalUpdateError) {
      console.error('Poll total votes update error:', totalUpdateError);
    }

    revalidatePath(`/polls/${pollId}`);
    revalidatePath('/polls');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Poll vote API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
