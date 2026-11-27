import { EmptyState } from "@/components/molecules/EmptyState";
import { ErrorState } from "@/components/molecules/ErrorState";
import { composeContacts } from "@/modules/conversations/composition";

import { ContactList } from "./ContactList";
import { toContactItem, type ContactListItem, type LoadMoreContacts } from "./contact-types";

type ContactsData =
  { state: "empty" } | { state: "ok"; items: ContactListItem[]; nextCursor: string | null };

async function loadContacts(): Promise<ContactsData> {
  const { listContacts, tenantId } = await composeContacts();
  const page = await listContacts.execute(tenantId);

  if (page.items.length === 0) {
    return { state: "empty" };
  }

  return { state: "ok", items: page.items.map(toContactItem), nextCursor: page.nextCursor };
}

/** Carga la primera página de contactos y la pasa a la lista paginada. */
export async function ContactsScreen({ loadMore }: { loadMore: LoadMoreContacts }) {
  let data: ContactsData | undefined;
  try {
    data = await loadContacts();
  } catch {
    // El error se traduce en estado de pantalla, sin JSX dentro del try/catch.
  }

  if (!data) {
    return <ErrorState message="No se pudieron cargar los contactos. Inténtalo de nuevo." />;
  }
  if (data.state === "empty") {
    return (
      <EmptyState message="Aún no hay contactos. El primero aparece cuando alguien escribe o llama." />
    );
  }

  return <ContactList items={data.items} nextCursor={data.nextCursor} loadMore={loadMore} />;
}
