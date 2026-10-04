import type { MetadataRoute } from "next";
import { getAllTags, listSitemapEntries } from "@/lib/queries";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let people: { id: string; updated_at: string }[] = [];
  let tags: { tag: string; count: number }[] = [];
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
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/people`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/ranking/popularity`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/ranking/unpopular`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/ranking/trending`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/ranking/score`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/ranking/lowscore`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/polls`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/stats`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/meta`, lastModified: now, changeFrequency: "daily", priority: 0.4 },
  ];

  const tagPages: MetadataRoute.Sitemap = tags.map((t) => ({
    url: `${SITE_URL}/tag/${encodeURIComponent(t.tag)}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const personPages: MetadataRoute.Sitemap = people.map((p) => ({
    url: `${SITE_URL}/person/${p.id}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...tagPages, ...personPages];
}
