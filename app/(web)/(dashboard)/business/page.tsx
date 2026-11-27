import { PageHeader } from "@/components/molecules/PageHeader";
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

  return (
    <>
      <PageHeader title="Negocio" description="Datos y contexto de tu negocio." />
      <section className="flex flex-col gap-10">
        <div>
          <h2 className="mb-3 text-lg font-medium text-foreground">Perfil</h2>
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
        </div>

        <div>
          <h2 className="mb-3 text-lg font-medium text-foreground">Horarios</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Define los horarios de atención por día. No se permiten traslapes.
          </p>
          <BusinessHoursForm initialValues={hours} />
        </div>

        <div>
          <h2 className="mb-3 text-lg font-medium text-foreground">Catálogo</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Productos y servicios que el asistente puede ofrecer.
          </p>
          <CatalogForm initialValues={catalog} />
        </div>

        <div>
          <h2 className="mb-3 text-lg font-medium text-foreground">Preguntas frecuentes</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Respuestas rápidas para el asistente. Usa el orden para priorizarlas.
          </p>
          <FaqsForm initialValues={faqs} />
        </div>
      </section>
    </>
  );
}
