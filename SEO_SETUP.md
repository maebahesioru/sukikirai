# SEO設定ガイド

## 環境変数の設定

`.env.local`ファイルを作成し、以下を設定してください：

```bash
# サイトURL（本番環境のドメイン）
NEXT_PUBLIC_SITE_URL=https://hikamers-suki-kira.vercel.app
```

## 実装済みのSEO機能

### 1. メタデータ最適化
- ✅ タイトルタグ（動的テンプレート対応）
- ✅ ディスクリプション
- ✅ キーワード
- ✅ OGP（Open Graph Protocol）対応
- ✅ Twitter Card対応
- ✅ 言語設定（ja）
- ✅ ファビコン（SVG）
- ✅ OGP画像（`app/opengraph-image.png`）

### 2. 構造化データ（JSON-LD）
- ✅ WebSite スキーマ
- ✅ Person スキーマ（評価・投票数含む）
- ✅ BreadcrumbList スキーマ
- ✅ SearchAction スキーマ

### 3. robots.txt
場所: `public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Sitemap: https://hikamers-suki-kira.vercel.app/sitemap.xml
```

### 4. サイトマップ
自動生成: `app/sitemap.ts`

以下のページが含まれます：
- トップページ
- 好感度ランキング
- 不人気ランキング
- トレンドランキング
- 各人物ページ（動的生成）

アクセス: `https://hikamers-suki-kira.vercel.app/sitemap.xml`

### 5. Google Search Console設定

1. [Google Search Console](https://search.google.com/search-console)にアクセス
2. プロパティを追加
3. 所有権の確認
4. サイトマップを送信: `https://hikamers-suki-kira.vercel.app/sitemap.xml`

確認コードは `app/layout.tsx` の `verification.google` に設定：

```typescript
verification: {
  google: 'your-google-verification-code',
}
```

### 6. パフォーマンス最適化

- ✅ 画像最適化（Next.js Image自動最適化）
- ✅ フォント最適化（Geist Sans/Mono）
- ✅ レスポンシブデザイン
- ✅ モバイルフレンドリー

### 7. アクセシビリティ

- ✅ セマンティックHTML
- ✅ ARIA属性
- ✅ キーボードナビゲーション
- ✅ スクリーンリーダー対応

## SEOチェックリスト

### デプロイ前

- [ ] `NEXT_PUBLIC_SITE_URL` を本番URLに設定
- [ ] OGP画像を配置（`app/opengraph-image.png`）
- [ ] robots.txtのサイトマップURLを更新
- [ ] Google Search Consoleに登録
- [ ] Bing Webmaster Toolsに登録（オプション）

### デプロイ後

- [ ] サイトマップの確認: `/sitemap.xml`
- [ ] robots.txtの確認: `/robots.txt`
- [ ] OGP画像の確認: [Facebook Debugger](https://developers.facebook.com/tools/debug/)
- [ ] Twitter Cardの確認: [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [ ] 構造化データの確認: [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] モバイルフレンドリーテスト: [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [ ] PageSpeed Insights: [PageSpeed Insights](https://pagespeed.web.dev/)

## SEOキーワード戦略

### ターゲットキーワード

1. **メインキーワード**
   - ヒカマー 好き嫌い
   - ヒカマーズ 投票
   - ヒカマー ランキング

2. **ロングテールキーワード**
   - [人物名] 好き嫌い
   - [人物名] 評判
   - ヒカマー 好感度ランキング
   - ヒカマー 不人気ランキング

### コンテンツSEO

- 各人物ページに詳細な説明を追加
- コメント機能でユーザー生成コンテンツ（UGC）を増やす
- 定期的な更新（ランキングの更新）
- 内部リンクの最適化

## SNSシェア最適化

投稿時の自動テキスト：

```
【好き派/嫌い派】としてコメントを投稿しました！

「コメント本文」

#人物名 のこと好き？嫌い？
【好き派】XX% vs【嫌い派】XX%

#ヒカマーズ好き嫌いcom
```

## 分析ツール設定（推奨）

### Google Analytics 4
`app/layout.tsx`に追加:

```typescript
import Script from 'next/script'

// body内に追加
<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  `}
</Script>
```

### Microsoft Clarity（推奨）
無料のヒートマップ・セッションリプレイツール

## 継続的なSEO改善

1. **コンテンツの充実**
   - 新しい人物を追加
   - 詳細な説明文を記載
   - 関連人物のリンク

2. **パフォーマンス改善**
   - 画像の最適化
   - コードの最適化
   - CDNの利用

3. **バックリンク獲得**
   - SNSでのシェア促進
   - 関連サイトとの相互リンク

4. **定期的な分析**
   - Search Consoleでクエリ分析
   - Analyticsでユーザー行動分析
   - 改善点の特定と実装

## トラブルシューティング

### サイトマップが表示されない
- ビルド後にアクセス
- キャッシュをクリア
- `npm run build && npm start`で確認

### OGP画像が表示されない
- 画像サイズを確認（推奨: 1200x630px）
- キャッシュをクリア
- Facebook Debuggerで確認

### 検索結果に表示されない
- robots.txtを確認
- Search Consoleでインデックス状況を確認
- 時間を待つ（通常数日〜数週間）

## サポート

問題が発生した場合は、以下を確認：

1. Next.js 15のドキュメント
2. Vercelのドキュメント
3. Google Search Centralヘルプ
