import { describe, expect, it } from "vitest";

import { Contact } from "../domain/Contact";
import type { MessageEntry } from "../domain/Timeline";
import { InMemoryConversationRepository } from "../testing/InMemoryConversationRepository";
import { ListMessages } from "./ListMessages";
import { InvalidCursorError } from "./pagination";

const tenantId = "00000000-0000-4000-8000-000000000001";
const otherTenantId = "00000000-0000-4000-8000-000000000002";
const conversationId = "conversation-1";

function message(index: number, ownerConversation = conversationId): MessageEntry {
  return {
    type: "message",
    id: `message-${String(index).padStart(3, "0")}`,
    conversationId: ownerConversation,
    direction: index % 2 === 0 ? "inbound" : "outbound",
    kind: "text",
    body: `Mensaje ${index}`,
    mediaPath: null,
    transcript: null,
    at: new Date(Date.UTC(2026, 10, 1, 0, 0, index)).toISOString(),
  };
}

function repositoryWith(count: number, owner = tenantId): InMemoryConversationRepository {
  const repository = new InMemoryConversationRepository();
  repository.addContact(
    new Contact({
      id: "contact-1",
      tenantId: owner,
      waId: "5215500000001",
      phoneE164: "+5215500000001",
      name: "Ana",
      attributes: {},
      createdAt: "2026-11-01T10:00:00Z",
      redactedAt: null,
    }),
    conversationId,
  );
  for (let index = 0; index < count; index++) {
    repository.addEntry(message(index));
  }
  return repository;
}

describe("ListMessages", () => {
  it("returns the last 50 messages in ascending order", async () => {
    const repository = repositoryWith(120);

    const page = await new ListMessages(repository, tenantId).execute(conversationId);

    expect(page.items).toHaveLength(50);
    expect(page.items[0]?.id).toBe("message-070");
    expect(page.items[49]?.id).toBe("message-119");
    expect(page.nextCursor).not.toBeNull();
  });

  it("loads the previous page upwards without gaps or repeats", async () => {
    const repository = repositoryWith(120);
    const list = new ListMessages(repository, tenantId);

    const latest = await list.execute(conversationId);
    const previous = await list.execute(conversationId, { cursor: latest.nextCursor });

    expect(previous.items[0]?.id).toBe("message-020");
    expect(previous.items[49]?.id).toBe("message-069");
    expect(previous.items.some((item) => latest.items.some((p) => p.id === item.id))).toBe(false);
  });

  it("returns no cursor when the conversation has no older messages", async () => {
    const repository = repositoryWith(20);

    const page = await new ListMessages(repository, tenantId).execute(conversationId);

    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).toBeNull();
  });

  it("rejects an invalid cursor", async () => {
    const repository = repositoryWith(5);

    await expect(
      new ListMessages(repository, tenantId).execute(conversationId, { cursor: "%%%" }),
    ).rejects.toBeInstanceOf(InvalidCursorError);
  });

  it("does not return messages from another tenant", async () => {
    const repository = repositoryWith(5, otherTenantId);

    const page = await new ListMessages(repository, tenantId).execute(conversationId);

    expect(page.items).toEqual([]);
  });
});
