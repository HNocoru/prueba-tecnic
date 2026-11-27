import { Suspense } from "react";

import { ConversationViewSkeleton } from "@/components/molecules/InboxSkeleton";
import { ConversationScreen } from "@/components/organisms/ConversationScreen";

import { loadCallSessionAction, loadOlderMessagesAction } from "../actions";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  return (
    <Suspense fallback={<ConversationViewSkeleton />}>
      <ConversationScreen
        params={params}
        loadOlderMessages={loadOlderMessagesAction}
        loadCallSession={loadCallSessionAction}
      />
    </Suspense>
  );
}
