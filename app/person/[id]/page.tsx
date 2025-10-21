import PersonPageClient from './PersonPageClient';
import { getSidebarData } from '@/lib/sidebar-data';
import { supabase } from '@/lib/supabase';

export const dynamicParams = true;
export const dynamic = 'force-dynamic';

interface PersonPageProps {
  params: {
    id: string;
  };
}

export default async function PersonPage({ params }: PersonPageProps) {
  // サイドバー用のデータとvote数を並列取得
  const [{ trendingPeople, latestComments }, { data: votes }] = await Promise.all([
    getSidebarData(),
    supabase
      .from('votes')
      .select('vote_type')
      .eq('person_id', params.id)
  ]);

  // vote数を集計
  const likeCount = votes?.filter(v => v.vote_type === 'like').length || 0;
  const dislikeCount = votes?.filter(v => v.vote_type === 'dislike').length || 0;

  return (
    <PersonPageClient 
      personId={params.id}
      initialLikeCount={likeCount}
      initialDislikeCount={dislikeCount}
      trendingPeople={trendingPeople}
      latestComments={latestComments}
    />
  );
}
