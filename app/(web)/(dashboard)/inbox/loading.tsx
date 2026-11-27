import { InboxSkeleton } from "@/components/molecules/InboxSkeleton";
import { PageHeader } from "@/components/molecules/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader title="Bandeja" description="Conversaciones y llamadas de tus contactos." />
      <InboxSkeleton />
    </>
  );
}
