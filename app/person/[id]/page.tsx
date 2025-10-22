import PersonPageClient from './PersonPageClient';
import { getSidebarData } from '@/lib/sidebar-data';
import { supabase } from '@/lib/supabase';

export const dynamicParams = true;
// ISRで60秒ごとに再検証（頻繁にアクセスされるページをキャッシュ）
export const revalidate = 60;

interface PersonPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PersonPage({ params }: PersonPageProps) {
  // Next.js 15: paramsを先にawait
  const { id } = await params;
  
  // サイドバー用のデータとvote数を並列取得
  const [{ trendingPeople, latestComments }, { data: votes }] = await Promise.all([
    getSidebarData(),
    supabase
      .from('votes')
      .select('vote_type')
      .eq('person_id', id)
  ]);

  // vote数を集計
  const likeCount = votes?.filter(v => v.vote_type === 'like').length || 0;
  const dislikeCount = votes?.filter(v => v.vote_type === 'dislike').length || 0;

  return (
    <PersonPageClient 
      personId={id}
      initialLikeCount={likeCount}
      initialDislikeCount={dislikeCount}
      trendingPeople={trendingPeople}
      latestComments={latestComments}
    />
  );
}
