import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function POST() {
  try {
    // Generate secure user token
    const userToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1年間有効

    return NextResponse.json({
      success: true,
      userToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Terms agreement error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
