import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TermsGate from "@/components/TermsGate";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">{children}</main>
      <Footer />
      <TermsGate />
    </div>
  );
}
