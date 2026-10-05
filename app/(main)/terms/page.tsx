import type { Metadata } from "next";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import TermsContent from "@/components/TermsContent";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
  title: "利用規約",
  alternates: { canonical: localePath(locale, "/terms") },
  };
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto bg-panel border border-line rounded-2xl p-6 md:p-8">
      <TermsContent />
    </div>
  );
}
