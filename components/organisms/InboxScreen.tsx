import { ErrorState } from "@/components/molecules/ErrorState";
import { composeInbox } from "@/modules/conversations/composition";

import { InboxRealtime } from "./InboxRealtime";
import { toConversationItem, type LoadMoreConversations } from "./inbox-types";
import { InboxShell } from "./InboxShell";

import type { ReactNode } from "react";

async function loadFirstPage() {
  const { listConversations } = await composeInbox();
  return listConversations.execute();
}

/**
 * Pantalla del layout de /inbox: carga la primera página de conversaciones una sola
 * vez (no se repite al cambiar de conversación) y monta la rejilla con la lista.
 * `children` es el hilo + panel de contacto de la ruta activa.
 */
export async function InboxScreen({
  loadMoreConversations,
  children,
}: {
  loadMoreConversations: LoadMoreConversations;
  children: ReactNode;
}) {
  let page: Awaited<ReturnType<typeof loadFirstPage>> | undefined;
  try {
    page = await loadFirstPage();
  } catch {
    // Sin JSX dentro de try/catch: el error se traduce en estado de la pantalla.
  }

  if (!page) {
    return <ErrorState message="No se pudo cargar la bandeja. Inténtalo de nuevo." />;
  }

  // El suscriptor vive en todos los estados: el primer mensaje también debe aparecer en vivo.
  return (
    <>
      <InboxRealtime />
      <InboxShell
        items={page.items.map(toConversationItem)}
        nextCursor={page.nextCursor}
        empty={page.items.length === 0}
        loadMore={loadMoreConversations}
      >
        {children}
      </InboxShell>
    </>
  );
}
