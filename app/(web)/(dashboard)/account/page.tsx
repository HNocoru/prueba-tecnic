import { PageHeader } from "@/components/molecules/PageHeader";
import { EmptyState } from "@/components/molecules/EmptyState";

export default function AccountPage() {
  return (
    <>
      <PageHeader title="Cuenta" description="Tu perfil y datos de acceso." />
      <EmptyState message="Tu perfil aún no está disponible. Pronto podrás editar tus datos." />
    </>
  );
}
