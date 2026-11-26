import { PageHeader } from "@/components/molecules/PageHeader";
import { EmptyState } from "@/components/molecules/EmptyState";

export default function BusinessPage() {
  return (
    <>
      <PageHeader title="Negocio" description="Datos y contexto de tu negocio." />
      <EmptyState message="Aún no has configurado tu negocio. Pronto podrás agregar horarios, catálogo y políticas." />
    </>
  );
}
