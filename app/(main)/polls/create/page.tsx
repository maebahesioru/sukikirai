import type { Metadata } from "next";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import CreatePollForm from "./CreatePollForm";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getServerT();
  return {
    title: t("投票トークを作成"),
    alternates: { canonical: localePath(locale, "/polls/create") },
  };
}

export default function CreatePollPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <CreatePollForm />
    </div>
  );
}
