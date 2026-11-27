import { CardSkeleton } from "@/components/molecules/CardSkeleton";
import { PageHeader } from "@/components/molecules/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader title="Asistente" description="Configura cómo atiende tu asistente." />
      <CardSkeleton />
    </>
  );
}
