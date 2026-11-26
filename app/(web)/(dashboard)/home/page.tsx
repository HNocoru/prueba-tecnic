import { PageHeader } from "@/components/molecules/PageHeader";
import { StatusCard } from "@/components/molecules/StatusCard";

export default function HomePage() {
  return (
    <>
      <PageHeader
        title="Bienvenido"
        description="Conecta tu WhatsApp para que tu asistente empiece a atender."
      />
      <StatusCard
        title="Conectar WhatsApp"
        status="No conectado"
        description="Vincula el número de WhatsApp de tu negocio. Próximamente disponible."
        actionLabel="Conectar WhatsApp"
      />
    </>
  );
}
