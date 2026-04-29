import { ImageResponse } from 'next/og';

export const alt = 'ヒカマーズ好き嫌い.com';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', backgroundImage: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' }}>
        <div style={{ fontSize: 80, fontWeight: 'bold', color: '#fbbf24', marginBottom: 20 }}>ヒカマーズ</div>
        <div style={{ fontSize: 48, color: '#e2e8f0' }}>好き嫌い.com</div>
        <div style={{ fontSize: 32, color: '#94a3b8', marginTop: 20 }}>界隈のあの人のこと好き？嫌い？</div>
      </div>
    ),
    { ...size }
  );
}
