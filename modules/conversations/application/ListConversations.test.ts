import { describe, expect, it } from "vitest";

import { Contact } from "../domain/Contact";
import type { MessageEntry } from "../domain/Timeline";
import { InMemoryConversationRepository } from "../testing/InMemoryConversationRepository";
import { ListConversations } from "./ListConversations";

const tenantId = "00000000-0000-4000-8000-000000000001";
const otherTenantId = "00000000-0000-4000-8000-000000000002";

function contact(id: string, name: string, owner = tenantId): Contact {
  return new Contact({
    id,
    tenantId: owner,
    waId: `521550000${id.slice(-3)}`,
    phoneE164: "+5215500000001",
    name,
    attributes: {},
    createdAt: "2026-11-01T10:00:00Z",
    redactedAt: null,
  });
}

function message(id: string, conversationId: string, at: string, body: string): MessageEntry {
  return {
    type: "message",
    id,
    conversationId,
    direction: "inbound",
    kind: "text",
    body,
    mediaPath: null,
    transcript: null,
    at,
  };
}

describe("ListConversations", () => {
  it("returns the tenant conversations ordered by last activity descending", async () => {
    const repository = new InMemoryConversationRepository();
    repository.addSummary({
      conversation: {
        id: "older",
        tenantId,
        contactId: "contact-older",
        lastActivityAt: "2026-11-20T09:00:00Z",
      },
      contact: contact("contact-older", "Ana"),
      lastMessage: message("m1", "older", "2026-11-20T09:00:00Z", "Hola"),
    });
    repository.addSummary({
      conversation: {
        id: "newer",
        tenantId,
        contactId: "contact-newer",
        lastActivityAt: "2026-11-24T12:00:00Z",
      },
      contact: contact("contact-newer", "Beto"),
      lastMessage: message("m2", "newer", "2026-11-24T12:00:00Z", "Gracias"),
    });

    const result = await new ListConversations(repository, tenantId).execute();

    expect(result.map((item) => item.conversation.id)).toEqual(["newer", "older"]);
    expect(result[0]?.contact.name).toBe("Beto");
    expect(result[0]?.lastMessage?.body).toBe("Gracias");
  });

  it("does not include conversations from another tenant", async () => {
    const repository = new InMemoryConversationRepository();
    repository.addContact(contact("mine", "Ana"));
    repository.addContact(contact("theirs", "Luis", otherTenantId));

    const result = await new ListConversations(repository, tenantId).execute();

    expect(result).toHaveLength(1);
    expect(result[0]?.contact.id).toBe("mine");
  });

  it("returns an empty list when the tenant has no conversations", async () => {
    const repository = new InMemoryConversationRepository();
    repository.addContact(contact("theirs", "Luis", otherTenantId));

    await expect(new ListConversations(repository, tenantId).execute()).resolves.toEqual([]);
  });
});
