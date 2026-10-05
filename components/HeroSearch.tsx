"use client";

import { useRouter } from "next/navigation";
import SearchSuggest from "@/components/SearchSuggest";
import { useT } from "@/lib/i18n-client";

export default function HeroSearch() {
  const router = useRouter();
  const t = useT();
  return (
    <SearchSuggest
      formClassName="flex gap-2 max-w-xl"
      inputClassName="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-line bg-panel focus:outline-none focus:ring-2 focus:ring-x/60 text-sm"
      iconClassName="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mut"
      placeholder={t("@IDまたは名前で検索（未登録ユーザーは候補から追加）")}
      onSubmit={(query) => router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search")}
      submitButton={
        <button
          type="submit"
          className="px-5 rounded-2xl bg-x text-white font-bold text-sm hover:opacity-90 transition"
        >
          {t("検索")}
        </button>
      }
    />
  );
}
