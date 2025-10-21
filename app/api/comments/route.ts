import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// サーバー側でService Role Keyを使用（RLSをバイパス）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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
      userToken,
      turnstileToken 
    } = await request.json();

    // Validate required fields
    if (!personId || !voteType || !content || !userToken || !turnstileToken) {
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

    // Verify Turnstile token on server side
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
