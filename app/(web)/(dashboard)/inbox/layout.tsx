import { Suspense, type ReactNode } from "react";

import { InboxSkeleton } from "@/components/molecules/InboxSkeleton";
import { PageHeader } from "@/components/molecules/PageHeader";
import { InboxScreen } from "@/components/organisms/InboxScreen";

import { loadMoreConversationsAction } from "./actions";

/**
 * La lista de conversaciones vive aquí: un layout no se vuelve a renderizar al navegar
 * entre /inbox/[conversationId], así que la lista conserva scroll, búsqueda, filtro,
 * páginas cargadas y suscripciones de Realtime. Solo se recarga el hilo (children).
 */
export default function InboxLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="Bandeja" description="Conversaciones y llamadas de tus contactos." />
      <Suspense fallback={<InboxSkeleton />}>
        <InboxScreen loadMoreConversations={loadMoreConversationsAction}>{children}</InboxScreen>
      </Suspense>
    </>
  );
}
