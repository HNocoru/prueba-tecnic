import { languageLabel, previewText, voiceLabel } from "@/components/atoms/p5-presentation";
import { p5CardClass } from "@/components/atoms/p5-styles";
import { P5PageHeader } from "@/components/molecules/P5PageHeader";
import { P5SectionCard } from "@/components/molecules/P5SectionCard";
import { composeAssistant } from "@/modules/business/composition";

import { AssistantConfigForm } from "./AssistantConfigForm";

export default async function AssistantPage() {
  const { getAssistantRaw } = await composeAssistant();
  const assistant = await getAssistantRaw();

  const name = assistant.name ?? "Asistente";
  const voice = voiceLabel(assistant.voice === "eduardo" ? "eduardo" : "roberto");
  const language = languageLabel(assistant.language ?? "es-MX");
  const greeting = previewText(assistant.greeting);
  const escalation = previewText(assistant.escalationMessage);

  return (
    <>
      <P5PageHeader
        title="Asistente"
        description="Cómo habla y qué hace la IA cuando alguien escribe o llama."
      />

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <P5SectionCard
          title="Tu asistente"
          description="Un solo asistente atiende todos los mensajes y llamadas de tu WhatsApp."
          icon="sparkles"
        >
          <AssistantConfigForm
            initialValues={{
              name,
              tone: assistant.tone ?? "",
              voice: assistant.voice ?? "roberto",
              language: assistant.language ?? "es-MX",
              greeting: assistant.greeting ?? "",
              escalationMessage: assistant.escalationMessage ?? "",
            }}
          />
        </P5SectionCard>

        <aside className={p5CardClass}>
          <h2
            className="text-xl font-semibold text-text md:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Vista previa
          </h2>
          <p className="mt-1 text-sm text-text-2">
            Así respondería con lo que tienes ahora. Es un ejemplo, no una respuesta real de la IA.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface p-3">
              <dt className="text-xs text-text-2">Nombre</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-text">{name}</dd>
            </div>
            <div className="rounded-2xl bg-surface p-3">
              <dt className="text-xs text-text-2">Voz</dt>
              <dd className="mt-1 text-sm font-semibold text-text">{voice}</dd>
            </div>
            <div className="col-span-2 rounded-2xl bg-surface p-3">
              <dt className="text-xs text-text-2">Idioma</dt>
              <dd className="mt-1 text-sm font-semibold text-text">{language}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-col gap-3">
            <div className="max-w-[92%] rounded-2xl bg-soft p-3">
              <p className="text-xs font-semibold text-accent">{name}</p>
              <p className="mt-1 break-words text-sm text-text">{greeting}</p>
            </div>
            <div className="ml-auto max-w-[92%] rounded-2xl bg-surface p-3">
              <p className="text-xs font-semibold text-text-2">Escalamiento</p>
              <p className="mt-1 break-words text-sm text-text">{escalation}</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
