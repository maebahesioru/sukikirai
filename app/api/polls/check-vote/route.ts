import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get('pollId');
    const userToken = searchParams.get('userToken');

    if (!pollId || !userToken) {
      return NextResponse.json(
        { success: false, error: 'Missing parameters' },
        { status: 400 }
      );
    }

    const { data: vote } = await supabaseAdmin
      .from('poll_votes')
      .select('option_id')
      .eq('poll_id', pollId)
      .eq('cookie_id', userToken)
      .single();

    return NextResponse.json({
      hasVoted: !!vote,
      optionId: vote?.option_id || null,
    });
  } catch (error) {
    console.error('Check vote API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
