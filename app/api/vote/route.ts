import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { personId, voteType, cookieId, turnstileToken } = await request.json();

    if (!personId || !voteType || !cookieId || !turnstileToken) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
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

    // Get IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Check if IP has already voted today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existingVotes } = await supabase
      .from('votes')
      .select('id')
      .eq('person_id', personId)
      .eq('ip_address', ip)
      .gte('created_at', today.toISOString());

    if (existingVotes && existingVotes.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Already voted today from this IP' },
        { status: 429 }
      );
    }

    // Save vote to database
    const { error } = await supabase.from('votes').insert({
      person_id: personId,
      vote_type: voteType,
      cookie_id: cookieId,
      ip_address: ip,
    });

    if (error) {
      console.error('Vote insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save vote' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ip });
  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
