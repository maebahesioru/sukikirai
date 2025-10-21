'use client';

import dynamic from 'next/dynamic';
import { ComponentProps } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

// Turnstileを動的インポート（必要な時だけロード）
const DynamicTurnstile = dynamic(
  () => import('@marsidev/react-turnstile').then((mod) => mod.Turnstile),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-16 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-600">認証を読み込み中...</p>
      </div>
    ),
  }
);

export default DynamicTurnstile;
export type { TurnstileInstance } from '@marsidev/react-turnstile';
