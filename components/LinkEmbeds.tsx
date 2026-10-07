"use client";

import { useEffect, useMemo, useState } from "react";
import { extractUrls, type EmbedData } from "@/lib/embed-url";
import { useT } from "@/lib/i18n-client";

function fmtNum(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString();
}

function TweetCard({ e }: { e: Extract<EmbedData, { kind: "tweet" }> }) {
  return (
    <a
      href={e.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-panel2 border border-line rounded-xl p-3 hover:border-line2 transition max-w-xl"
    >
      <div className="flex items-center gap-2 mb-2">
        {e.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={e.avatar}
            alt=""
            className="w-6 h-6 rounded-full object-cover bg-line shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-line shrink-0" />
        )}
        <span className="font-bold text-sm truncate">{e.name}</span>
        <span className="text-xs text-mut truncate">@{e.handle}</span>
        <span className="ml-auto text-[11px] text-mut shrink-0 font-bold">𝕏</span>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words line-clamp-6">
        {e.text}
      </p>
      {e.media.length > 0 && (
        <div className={`mt-2 grid gap-1 ${e.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {e.media.map((m, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" className="w-full max-h-72 object-cover" loading="lazy" />
              {m.type === "video" && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center text-sm">
                    ▶
                  </span>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {e.quote && (
        <div className="mt-2 border border-line rounded-lg p-2.5 bg-panel">
          <div className="flex items-center gap-1.5 mb-1">
            {e.quote.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={e.quote.avatar}
                alt=""
                className="w-4 h-4 rounded-full object-cover bg-line shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-line shrink-0" />
            )}
            <span className="font-bold text-xs truncate">{e.quote.name}</span>
            <span className="text-[11px] text-mut truncate">@{e.quote.handle}</span>
          </div>
          <p className="text-xs text-mut leading-relaxed whitespace-pre-wrap break-words line-clamp-4">
            {e.quote.text}
          </p>
          {e.quote.media.length > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={e.quote.media[0].url}
              alt=""
              className="mt-1.5 rounded-md border border-line w-full max-h-40 object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}
      <div className="flex items-center gap-3 mt-2 text-[11px] text-mut">
        <span>♥ {fmtNum(e.likes)}</span>
        <span>RT {fmtNum(e.retweets)}</span>
      </div>
    </a>
  );
}

function ProfileCard({ e }: { e: Extract<EmbedData, { kind: "profile" }> }) {
  const t = useT();
  return (
    <a
      href={e.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-panel2 border border-line rounded-xl p-3 hover:border-line2 transition max-w-xl"
    >
      <div className="flex items-center gap-2.5">
        {e.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={e.avatar}
            alt=""
            className="w-9 h-9 rounded-full object-cover bg-line shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-line shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm truncate">{e.name}</div>
          <div className="text-xs text-mut truncate">
            {t("@{handle}・フォロワー{n}", { handle: e.handle, n: fmtNum(e.followers) })}
          </div>
        </div>
        <span className="text-[11px] text-mut shrink-0 font-bold">𝕏</span>
      </div>
      {e.bio && (
        <p className="text-xs text-mut mt-2 line-clamp-2 whitespace-pre-wrap">{e.bio}</p>
      )}
    </a>
  );
}

function OgCard({ e }: { e: Extract<EmbedData, { kind: "og" }> }) {
  let host = e.url;
  try {
    host = new URL(e.url).hostname;
  } catch {
    /* noop */
  }
  return (
    <a
      href={e.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-panel2 border border-line rounded-xl overflow-hidden hover:border-line2 transition max-w-xl"
    >
      {e.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={e.image}
          alt=""
          className="w-full max-h-56 object-cover border-b border-line"
          loading="lazy"
        />
      )}
      <div className="p-3">
        <div className="text-[11px] text-mut truncate">{e.site || host}</div>
        <div className="font-bold text-sm mt-0.5 line-clamp-2">{e.title}</div>
        {e.description && (
          <p className="text-xs text-mut mt-1 line-clamp-3">{e.description}</p>
        )}
      </div>
    </a>
  );
}

/** 本文中のURLを埋め込みカードで表示（X=ツイート/プロフィール・他=OGP） */
export default function LinkEmbeds({
  text,
  max = 5,
  className,
}: {
  text: string;
  max?: number;
  className?: string;
}) {
  const urls = useMemo(() => extractUrls(text, max), [text, max]);
  const [embeds, setEmbeds] = useState<Record<string, EmbedData | null>>({});
  const key = urls.join("|");

  useEffect(() => {
    if (!urls.length) return;
    let alive = true;
    (async () => {
      for (const u of urls) {
        try {
          const r = await fetch(`/api/embed?url=${encodeURIComponent(u)}`);
          const d = await r.json();
          if (alive) setEmbeds((prev) => ({ ...prev, [u]: d?.success ? d.embed : null }));
        } catch {
          if (alive) setEmbeds((prev) => ({ ...prev, [u]: null }));
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const list = urls.map((u) => embeds[u]).filter((e): e is EmbedData => !!e);
  if (list.length === 0) return null;
  return (
    <div className={`space-y-2 mt-2 ${className ?? ""}`}>
      {list.map((e) =>
        e.kind === "tweet" ? (
          <TweetCard key={e.url} e={e} />
        ) : e.kind === "profile" ? (
          <ProfileCard key={e.url} e={e} />
        ) : (
          <OgCard key={e.url} e={e} />
        )
      )}
    </div>
  );
}
