import { CardSkeleton } from "@/components/molecules/CardSkeleton";
import { PageHeader } from "@/components/molecules/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader title="Negocio" description="Datos y contexto de tu negocio." />
      <CardSkeleton />
    </>
  );
}
