import { Metadata } from 'next';
import PeoplePageClient from './PeoplePageClient';

export const metadata: Metadata = {
  title: '全人物一覧 - ヒカマーズ好き嫌い.com',
  description: '登録されている全ての人物を一覧表示。タグでフィルタリングして検索できます。',
  openGraph: {
    title: '全人物一覧 - ヒカマーズ好き嫌い.com',
    description: '登録されている全ての人物を一覧表示。タグでフィルタリングして検索できます。',
  },
};

export const revalidate = 10; // ISR: 10秒ごとに再生成

export default function PeoplePage() {
  return <PeoplePageClient />;
}
