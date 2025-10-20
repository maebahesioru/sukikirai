import PersonPageClient from './PersonPageClient';

export const dynamicParams = true;

interface PersonPageProps {
  params: {
    id: string;
  };
}

export default function PersonPage({ params }: PersonPageProps) {
  return <PersonPageClient personId={params.id} />;
}
