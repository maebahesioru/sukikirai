import PersonPageClient from './PersonPageClient';
import { getSidebarData } from '@/lib/sidebar-data';

export const dynamicParams = true;
export const dynamic = 'force-dynamic';

interface PersonPageProps {
  params: {
    id: string;
  };
}

export default async function PersonPage({ params }: PersonPageProps) {
  // サイドバー用のデータを取得
  const { trendingPeople, latestComments } = await getSidebarData();

  return (
    <PersonPageClient 
      personId={params.id}
      trendingPeople={trendingPeople}
      latestComments={latestComments}
    />
  );
}
