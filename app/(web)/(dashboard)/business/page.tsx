import { sectionProgressLabel } from "@/components/atoms/p5-presentation";
import { P5PageHeader } from "@/components/molecules/P5PageHeader";
import { P5SectionCard } from "@/components/molecules/P5SectionCard";
import { composeBusiness } from "@/modules/business/composition";

import { BusinessHoursForm } from "./BusinessHoursForm";
import { BusinessProfileForm } from "./BusinessProfileForm";
import { CatalogForm } from "./CatalogForm";
import { FaqsForm } from "./FaqsForm";

export default async function BusinessPage() {
  const { getProfileRaw, listHours, listCatalog, listFaqs, tenantId } = await composeBusiness();
  const [profile, hours, catalog, faqs] = await Promise.all([
    getProfileRaw.execute(tenantId),
    listHours(),
    listCatalog(),
    listFaqs(),
  ]);

  const filledSections = [
    Boolean(
      profile.legalName?.trim() ||
      profile.description?.trim() ||
      profile.address?.trim() ||
      profile.timezone?.trim() ||
      profile.policies?.trim() ||
      profile.contactPhone?.trim(),
    ),
    hours.length > 0,
    catalog.length > 0,
    faqs.length > 0,
  ].filter(Boolean).length;

  return (
    <>
      <P5PageHeader
        title="Negocio"
        description="Lo que la IA sabe de tu negocio para atender a tus clientes."
      />

      <div className="mb-5 rounded-3xl bg-hero p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2
              className="text-xl font-semibold text-text md:text-2xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Completa el perfil de tu negocio
            </h2>
            <p className="mt-1 text-sm text-text-2">{sectionProgressLabel(filledSections, 4)}</p>
          </div>
          <span
            className="text-3xl font-bold text-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {filledSections}/4
          </span>
        </div>
        <div aria-hidden="true" className="mt-4 h-2 w-full overflow-hidden rounded-full bg-card">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${filledSections * 25}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <P5SectionCard
          title="Datos generales"
          description="Es lo que la IA dice cuando alguien pregunta quiénes son y dónde están."
          icon="user"
        >
          <BusinessProfileForm
            initialValues={{
              legalName: profile.legalName ?? "",
              description: profile.description ?? "",
              address: profile.address ?? "",
              timezone: profile.timezone ?? "America/Mexico_City",
              policies: profile.policies ?? "",
              contactPhone: profile.contactPhone ?? "",
            }}
          />
        </P5SectionCard>

        <P5SectionCard
          title="Horario de atención"
          description="Define los horarios de atención por día. No se permiten traslapes."
          icon="clock"
        >
          <BusinessHoursForm initialValues={hours} />
        </P5SectionCard>

        <P5SectionCard
          title="Catálogo de productos o servicios"
          description="Productos y servicios que el asistente puede ofrecer."
          icon="chat"
        >
          <CatalogForm initialValues={catalog} />
        </P5SectionCard>

        <P5SectionCard
          title="Políticas y preguntas frecuentes"
          description="Respuestas rápidas para el asistente. Usa el orden para priorizarlas."
          icon="sparkles"
        >
          <FaqsForm initialValues={faqs} />
        </P5SectionCard>
      </div>
    </>
  );
}
