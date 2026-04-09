import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');

    if (!personId) {
      return NextResponse.json(
        { success: false, error: 'Missing personId' },
        { status: 400 }
      );
    }

    // 関連する投票トークを取得（related_person_idsに含まれるもの）
    const { data: polls } = await supabaseAdmin
      .from('polls')
      .select('*')
      .contains('related_person_ids', [personId])
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!polls || polls.length === 0) {
      return NextResponse.json({ success: true, polls: [] });
    }

    // 各投票の選択肢を取得
    const pollsWithOptions = await Promise.all(
      polls.map(async (poll) => {
        const { data: options } = await supabaseAdmin
          .from('poll_options')
          .select('*')
          .eq('poll_id', poll.id)
          .order('option_order', { ascending: true });

        return {
          poll,
          options: options || [],
        };
      })
    );

    return NextResponse.json({ success: true, polls: pollsWithOptions });
  } catch (error) {
    console.error('Related polls API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
