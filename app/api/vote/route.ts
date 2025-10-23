import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { personId, voteType, userToken } = await request.json();

    if (!personId || !voteType || !userToken) {
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

    // Check if user has already voted for this person
    const { data: existingVotes } = await supabase
      .from('votes')
      .select('id, vote_type')
      .eq('person_id', personId)
      .eq('cookie_id', userToken);

    if (existingVotes && existingVotes.length > 0) {
      const existingVoteType = existingVotes[0].vote_type;
      return NextResponse.json(
        { 
          success: false, 
          error: '既に投票済みです', 
          voteType: existingVoteType 
        },
        { status: 429 }
      );
    }

    // Save vote to database (using user token)
    const { error } = await supabase.from('votes').insert({
      person_id: personId,
      vote_type: voteType,
      cookie_id: userToken,
      ip_address: null,
    });

    if (error) {
      console.error('Vote insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save vote' },
        { status: 500 }
      );
    }

    // ISRキャッシュを無効化して最新データを反映
    revalidatePath(`/person/${personId}`);
    revalidatePath('/');
    revalidatePath('/ranking/trending');
    revalidatePath('/ranking/popularity');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
