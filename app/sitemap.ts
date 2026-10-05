import type { MetadataRoute } from "next";
import { getAllTags, listPolls, listSitemapEntries } from "@/lib/queries";
import { SITE_URL } from "@/lib/site";
import { LOCALES, localePath } from "@/lib/i18n-core";

export const dynamic = "force-dynamic";

/** 全ロケールのhreflangオルタネート（x-defaultはja） */
function alternatesFor(path: string) {
  const languages: Record<string, string> = {};
  for (const loc of LOCALES) {
    languages[loc] = `${SITE_URL}${localePath(loc, path)}`;
  }
  languages["x-default"] = `${SITE_URL}${path}`;
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let people: { id: string; updated_at: string }[] = [];
  let tags: { tag: string; count: number }[] = [];
  let polls: { id: string }[] = [];
  try {
    people = await listSitemapEntries();
  } catch {
    people = [];
  }
  try {
    tags = (await getAllTags()).slice(0, 30);
  } catch {
    tags = [];
  }
  try {
    polls = await listPolls(200);
  } catch {
    polls = [];
  }
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0, alternates: alternatesFor("/") },
    { url: `${SITE_URL}/people`, lastModified: now, changeFrequency: "daily", priority: 0.9, alternates: alternatesFor("/people") },
    { url: `${SITE_URL}/today`, lastModified: now, changeFrequency: "daily", priority: 0.8, alternates: alternatesFor("/today") },
    { url: `${SITE_URL}/sousenkyo`, lastModified: now, changeFrequency: "daily", priority: 0.7, alternates: alternatesFor("/sousenkyo") },
    { url: `${SITE_URL}/ranking/daily`, lastModified: now, changeFrequency: "hourly", priority: 0.9, alternates: alternatesFor("/ranking/daily") },
    { url: `${SITE_URL}/ranking/popularity`, lastModified: now, changeFrequency: "hourly", priority: 0.9, alternates: alternatesFor("/ranking/popularity") },
    { url: `${SITE_URL}/ranking/unpopular`, lastModified: now, changeFrequency: "hourly", priority: 0.8, alternates: alternatesFor("/ranking/unpopular") },
    { url: `${SITE_URL}/ranking/trending`, lastModified: now, changeFrequency: "hourly", priority: 0.9, alternates: alternatesFor("/ranking/trending") },
    { url: `${SITE_URL}/ranking/score`, lastModified: now, changeFrequency: "hourly", priority: 0.8, alternates: alternatesFor("/ranking/score") },
    { url: `${SITE_URL}/ranking/lowscore`, lastModified: now, changeFrequency: "hourly", priority: 0.8, alternates: alternatesFor("/ranking/lowscore") },
    { url: `${SITE_URL}/polls`, lastModified: now, changeFrequency: "daily", priority: 0.7, alternates: alternatesFor("/polls") },
    { url: `${SITE_URL}/stats`, lastModified: now, changeFrequency: "weekly", priority: 0.5, alternates: alternatesFor("/stats") },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.6, alternates: alternatesFor("/search") },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3, alternates: alternatesFor("/terms") },
    { url: `${SITE_URL}/meta`, lastModified: now, changeFrequency: "daily", priority: 0.4, alternates: alternatesFor("/meta") },
  ];

  const tagPages: MetadataRoute.Sitemap = tags.map((t) => {
    const path = `/tag/${encodeURIComponent(t.tag)}`;
    return {
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      alternates: alternatesFor(path),
    };
  });

  const personPages: MetadataRoute.Sitemap = people.map((p) => {
    const path = `/person/${p.id}`;
    return {
      url: `${SITE_URL}${path}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
      alternates: alternatesFor(path),
    };
  });

  const pollPages: MetadataRoute.Sitemap = polls.map((p) => {
    const path = `/polls/${p.id}`;
    return {
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
      alternates: alternatesFor(path),
    };
  });

  return [...staticPages, ...pollPages, ...tagPages, ...personPages];
}
