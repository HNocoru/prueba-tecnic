import { ConversationViewSkeleton } from "@/components/molecules/InboxSkeleton";

/** El layout pinta su propio esqueleto completo; aquí solo el hilo y el panel. */
export default function Loading() {
  return <ConversationViewSkeleton />;
}
