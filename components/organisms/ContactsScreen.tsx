import Link from "next/link";

import { P5StateNotice } from "@/components/molecules/P5StateNotice";
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
    return (
      <P5StateNotice
        tone="error"
        title="No pudimos cargar tus contactos"
        description="Revisa tu conexión e inténtalo de nuevo. Tus datos están a salvo."
        action={
          <Link
            href="/contacts"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-accent"
          >
            Reintentar
          </Link>
        }
      />
    );
  }

  if (data.state === "empty") {
    return (
      <P5StateNotice
        icon="inbox"
        title="Aún no tienes contactos"
        description="Cuando alguien escriba o llame al WhatsApp de tu negocio, aparecerá aquí con su nombre, su teléfono y cómo terminó la conversación."
        action={
          <Link
            href="/inbox"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-accent"
          >
            Ir a la bandeja
          </Link>
        }
      />
    );
  }

  return <ContactList items={data.items} nextCursor={data.nextCursor} loadMore={loadMore} />;
}
