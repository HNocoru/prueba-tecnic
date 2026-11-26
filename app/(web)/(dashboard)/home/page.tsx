import { PageHeader } from "@/components/molecules/PageHeader";
import { ErrorState } from "@/components/molecules/ErrorState";
import { ConnectWhatsAppCard } from "@/components/organisms/ConnectWhatsAppCard";
import { composeWhatsAppConnection } from "@/modules/channels/whatsapp/composition";
import { decideConnectionCard } from "@/modules/channels/whatsapp";

import { connectWhatsAppNumber } from "./actions";
import { resolveTenantId } from "./tenant";

export default async function HomePage() {
  const tenantId = await resolveTenantId();
  let connection = null;
  if (tenantId) {
    try {
      connection = await composeWhatsAppConnection().get.execute(tenantId);
    } catch {
      connection = null;
    }
  }

  return (
    <>
      <PageHeader
        title="Bienvenido"
        description="Conecta tu WhatsApp para que tu asistente empiece a atender."
      />
      {connection ? (
        <ConnectWhatsAppCard
          connection={connection}
          view={decideConnectionCard(connection.status, connection.displayPhone)}
          action={connectWhatsAppNumber}
        />
      ) : (
        <ErrorState message="No pudimos cargar el estado de WhatsApp. Recarga la página o vuelve a iniciar sesión." />
      )}
    </>
  );
}
