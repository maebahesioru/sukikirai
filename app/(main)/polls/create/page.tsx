import type { Metadata } from "next";
import CreatePollForm from "./CreatePollForm";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: t("投票トークを作成"),
    alternates: { canonical: "/polls/create" },
  };
}

export default function CreatePollPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <CreatePollForm />
    </div>
  );
}
