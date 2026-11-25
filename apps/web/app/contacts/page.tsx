import { EmptyState } from "@/components/molecules/EmptyState";

const EMPTY_MESSAGE = "Aún no hay contactos. Escribe al WhatsApp del negocio para crear el primero";

type FakeContact = {
  id: string;
  waId: string;
  name: string | null;
};

const FAKE_CONTACTS: FakeContact[] = [];

export default function ContactsPage() {
  const contacts = FAKE_CONTACTS;

  if (contacts.length > 0) {
    return (
      <ul className="flex flex-col gap-4">
        {contacts.map((contact) => (
          <li key={contact.id} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">{contact.name}</p>
          </li>
        ))}
      </ul>
    );
  }

  return <EmptyState message={EMPTY_MESSAGE} />;
}
