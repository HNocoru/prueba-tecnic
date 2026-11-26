import { PageHeader } from "@/components/molecules/PageHeader";
import { EmptyState } from "@/components/molecules/EmptyState";

export default function AssistantPage() {
  return (
    <>
      <PageHeader title="Asistente" description="Configura cómo atiende tu asistente." />
      <EmptyState message="Aún no has configurado tu asistente. Pronto podrás elegir nombre, tono y voz." />
    </>
  );
}
