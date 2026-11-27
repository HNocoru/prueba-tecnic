"use server";

import { toContactItem, type ContactPageResult } from "@/components/organisms/contact-types";
import { InvalidCursorError } from "@/modules/conversations";
import { composeContacts } from "@/modules/conversations/composition";

/** Entrada delgada: resuelve el tenant y delega la página al caso de uso. */
export async function loadMoreContactsAction(cursor: string): Promise<ContactPageResult> {
  const { listContacts, tenantId } = await composeContacts();

  try {
    const page = await listContacts.execute(tenantId, { cursor });
    return { items: page.items.map(toContactItem), nextCursor: page.nextCursor };
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      return { items: [], nextCursor: null, error: "invalid-cursor" };
    }
    throw error;
  }
}
