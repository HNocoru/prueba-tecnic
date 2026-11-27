import { ConversationViewSkeleton } from "@/components/molecules/InboxSkeleton";

/** Solo el hilo y el panel de contacto: la lista del layout no vuelve al esqueleto. */
export default function Loading() {
  return <ConversationViewSkeleton />;
}
