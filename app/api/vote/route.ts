import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { personId, voteType, userToken, turnstileToken } = await request.json();

    if (!personId || !voteType || !userToken || !turnstileToken) {
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

    // Verify Turnstile token
    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
        }),
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      return NextResponse.json(
        { success: false, error: 'Turnstile verification failed' },
        { status: 400 }
      );
    }

    // Check if user has already voted for this person
    const { data: existingVotes } = await supabase
      .from('votes')
      .select('id')
      .eq('person_id', personId)
      .eq('cookie_id', userToken);

    if (existingVotes && existingVotes.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Already voted' },
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
