'use client';

import { useEffect, useState } from 'react';

export function WebsiteStructuredData() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "ヒカマーズ好き嫌い.com",
    "description": "ヒカマー界隈のあの人のこと好き？嫌い？みんなの意見を見てコメントしよう！",
    "url": window.location.origin,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${window.location.origin}?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function PersonStructuredData({ 
  personName, 
  description, 
  likeCount, 
  dislikeCount 
}: { 
  personName: string; 
  description: string; 
  likeCount: number; 
  dislikeCount: number; 
}) {
  const totalVotes = likeCount + dislikeCount;
  const rating = totalVotes > 0 ? ((likeCount / totalVotes) * 5).toFixed(1) : '0';

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": personName,
    "description": description,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": rating,
      "bestRating": "5",
      "worstRating": "0",
      "ratingCount": totalVotes.toString()
    },
    "interactionStatistic": [
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/LikeAction",
        "userInteractionCount": likeCount
      },
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/DislikeAction",
        "userInteractionCount": dislikeCount
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function BreadcrumbStructuredData({ items }: { items: Array<{ name: string; url: string }> }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `${window.location.origin}${item.url}`
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
