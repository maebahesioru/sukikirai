import type { Metadata } from "next";
import TermsContent from "@/components/TermsContent";

export const metadata: Metadata = {
  title: "利用規約",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto bg-panel border border-line rounded-2xl p-6 md:p-8">
      <TermsContent />
    </div>
  );
}
