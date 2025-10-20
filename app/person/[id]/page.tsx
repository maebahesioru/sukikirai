import PersonPageClient from './PersonPageClient';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateStaticParams() {
  // 空の配列を返すことで、すべてのパラメータを動的に処理
  return [];
}

interface PersonPageProps {
  params: {
    id: string;
  };
}

export default function PersonPage({ params }: PersonPageProps) {
  return <PersonPageClient personId={params.id} />;
}
