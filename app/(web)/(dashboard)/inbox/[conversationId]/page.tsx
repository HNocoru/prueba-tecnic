import { Suspense } from "react";

import { LoadingState } from "@/components/molecules/LoadingState";
import { PageHeader } from "@/components/molecules/PageHeader";
import { InboxScreen } from "@/components/organisms/InboxScreen";

export default function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <PageHeader title="Bandeja" description="Conversaciones y llamadas de tus contactos." />
      <Suspense fallback={<LoadingState />}>
        <InboxScreen params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
