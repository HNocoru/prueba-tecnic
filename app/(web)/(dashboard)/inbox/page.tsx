import { PageHeader } from "@/components/molecules/PageHeader";
import { EmptyState } from "@/components/molecules/EmptyState";

export default function InboxPage() {
  return (
    <>
      <PageHeader title="Bandeja" description="Conversaciones y llamadas de tus contactos." />
      <EmptyState message="Aún no hay conversaciones. Escribe al WhatsApp del negocio para crear la primera" />
    </>
  );
}
