import { PageHeader } from "@/components/molecules/PageHeader";
import { composeAssistant } from "@/modules/business/composition";
import { AssistantConfigForm } from "./AssistantConfigForm";

export default async function AssistantPage() {
  const { getAssistantRaw } = await composeAssistant();
  const assistant = await getAssistantRaw();

  return (
    <>
      <PageHeader title="Asistente" description="Configura cómo atiende tu asistente." />
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="mb-3 text-lg font-medium text-foreground">Configuración</h2>
          <AssistantConfigForm
            initialValues={{
              name: assistant.name ?? "Asistente",
              tone: assistant.tone ?? "",
              voice: assistant.voice ?? "roberto",
              language: assistant.language ?? "es-MX",
              greeting: assistant.greeting ?? "",
              escalationMessage: assistant.escalationMessage ?? "",
            }}
          />
        </div>
      </section>
    </>
  );
}
