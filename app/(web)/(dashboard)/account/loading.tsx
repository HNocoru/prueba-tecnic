import { CardSkeleton } from "@/components/molecules/CardSkeleton";
import { PageHeader } from "@/components/molecules/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader title="Cuenta" description="Tu perfil y datos de acceso." />
      <CardSkeleton />
    </>
  );
}
