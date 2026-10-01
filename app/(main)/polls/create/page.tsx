import type { Metadata } from "next";
import CreatePollForm from "./CreatePollForm";

export const metadata: Metadata = {
  title: "投票トークを作成",
  alternates: { canonical: "/polls/create" },
};

export default function CreatePollPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <CreatePollForm />
    </div>
  );
}
