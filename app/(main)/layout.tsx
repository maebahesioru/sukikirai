import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TermsGate from "@/components/TermsGate";
import { AmazonPicks } from "@/components/AmazonPicks";
import { getLocale, getMessages } from "@/lib/i18n-server";
import { LocaleProvider } from "@/lib/i18n-client";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dict = getMessages(locale);
  return (
    <LocaleProvider locale={locale} dict={dict}>
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 w-full">
        {/* 1900px以上: 左右に「おすすめ商品」レールを追加（本文は中央1152pxのまま動かさない） */}
        <div className="mx-auto grid w-full max-w-[1900px] grid-cols-1 gap-x-8 px-4 py-6 min-[1900px]:grid-cols-[minmax(0,1fr)_minmax(0,1152px)_minmax(0,1fr)]">
          <aside className="hidden min-[1900px]:block">
            <div className="sticky top-20 ml-auto w-full max-w-[300px]">
              <AmazonPicks variant="rail" />
            </div>
          </aside>
          <main className="min-w-0 w-full max-w-6xl mx-auto min-[1900px]:mx-0 min-[1900px]:max-w-none">
            {children}
          </main>
          <aside className="hidden min-[1900px]:block">
            <div className="sticky top-20 mr-auto w-full max-w-[300px]">
              <AmazonPicks variant="rail" />
            </div>
          </aside>
        </div>
        {/* 1900px未満: フッター直上にインライン表示（レール表示時は非表示） */}
        <div className="mx-auto w-full max-w-6xl px-4 pb-6 min-[1900px]:hidden">
          <AmazonPicks variant="inline" />
        </div>
      </div>
      <Footer />
      <TermsGate />
    </div>
    </LocaleProvider>
  );
}
