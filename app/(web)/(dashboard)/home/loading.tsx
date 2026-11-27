import { CardSkeleton } from "@/components/molecules/CardSkeleton";
import { PageHeader } from "@/components/molecules/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader
        title="Bienvenido"
        description="Conecta tu WhatsApp para que tu asistente empiece a atender."
      />
      <CardSkeleton />
    </>
  );
}
