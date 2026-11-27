import type { Contact } from "@/modules/conversations";

export interface ContactListItem {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  redacted: boolean;
}

export type ContactPageResult = {
  items: ContactListItem[];
  nextCursor: string | null;
  error?: "invalid-cursor";
};

export type LoadMoreContacts = (cursor: string) => Promise<ContactPageResult>;

export function toContactItem(contact: Contact): ContactListItem {
  return {
    id: contact.id,
    name: contact.isRedacted ? "Contacto anonimizado" : (contact.name?.trim() ?? "Sin nombre"),
    phone: contact.isRedacted ? "—" : (contact.phoneE164 ?? contact.waId),
    createdAt: contact.createdAt,
    redacted: contact.isRedacted,
  };
}
