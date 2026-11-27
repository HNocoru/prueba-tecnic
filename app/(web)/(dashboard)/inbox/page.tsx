import { InboxView } from "@/components/organisms/InboxView";

import { loadCallSessionAction, loadOlderMessagesAction } from "./actions";

/** Sin conversación elegida: no necesita datos, la lista ya la pinta el layout. */
export default function InboxPage() {
  return (
    <InboxView
      messages={[]}
      calls={[]}
      messagesNextCursor={null}
      contact={null}
      loadOlderMessages={loadOlderMessagesAction}
      loadCallSession={loadCallSessionAction}
    />
  );
}
