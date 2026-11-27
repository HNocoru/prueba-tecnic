import { Suspense } from "react";

import { InboxSkeleton } from "@/components/molecules/InboxSkeleton";
import { PageHeader } from "@/components/molecules/PageHeader";
import { InboxScreen } from "@/components/organisms/InboxScreen";

export default function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <PageHeader title="Bandeja" description="Conversaciones y llamadas de tus contactos." />
      <Suspense fallback={<InboxSkeleton />}>
        <InboxScreen searchParams={searchParams} />
      </Suspense>
    </>
  );
}
