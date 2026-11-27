import { describe, expect, it } from "vitest";

import { Contact } from "../domain/Contact";
import type { MessageEntry } from "../domain/Timeline";
import { InMemoryConversationRepository } from "../testing/InMemoryConversationRepository";
import { GetConversation } from "./GetConversation";
import { ListConversations } from "./ListConversations";
import { InvalidCursorError } from "./pagination";

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

function summary(index: number, owner = tenantId) {
  const id = `conversation-${String(index).padStart(2, "0")}`;
  return {
    conversation: {
      id,
      tenantId: owner,
      contactId: `contact-${index}`,
      // Índice mayor = actividad más reciente.
      lastActivityAt: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString(),
    },
    contact: contact(`contact-${index}`, `Contacto ${index}`, owner),
    lastMessage: message(`message-${index}`, id, "2026-11-01T10:00:00Z", `Hola ${index}`),
    latestRequest: null,
  };
}

function repositoryWith(count: number): InMemoryConversationRepository {
  const repository = new InMemoryConversationRepository();
  for (let index = 0; index < count; index++) {
    repository.addSummary(summary(index));
  }
  return repository;
}

describe("ListConversations", () => {
  it("returns the first page ordered by last activity descending", async () => {
    const repository = repositoryWith(35);

    const page = await new ListConversations(repository, tenantId).execute({ limit: 10 });

    expect(page.items.map((item) => item.conversation.id)).toEqual([
      "conversation-34",
      "conversation-33",
      "conversation-32",
      "conversation-31",
      "conversation-30",
      "conversation-29",
      "conversation-28",
      "conversation-27",
      "conversation-26",
      "conversation-25",
    ]);
    expect(page.nextCursor).not.toBeNull();
    expect(page.items[0]?.lastMessage?.body).toBe("Hola 34");
  });

  it("returns the next page from the opaque cursor without repeating items", async () => {
    const repository = repositoryWith(35);
    const list = new ListConversations(repository, tenantId);

    const first = await list.execute({ limit: 10 });
    const second = await list.execute({ limit: 10, cursor: first.nextCursor });

    expect(second.items.map((item) => item.conversation.id)).toEqual([
      "conversation-24",
      "conversation-23",
      "conversation-22",
      "conversation-21",
      "conversation-20",
      "conversation-19",
      "conversation-18",
      "conversation-17",
      "conversation-16",
      "conversation-15",
    ]);
    expect(
      second.items.some((item) =>
        first.items.some((p) => p.conversation.id === item.conversation.id),
      ),
    ).toBe(false);
  });

  it("returns no cursor at the end of the list", async () => {
    const repository = repositoryWith(12);
    const list = new ListConversations(repository, tenantId);

    const first = await list.execute({ limit: 10 });
    const second = await list.execute({ limit: 10, cursor: first.nextCursor });

    expect(second.items).toHaveLength(2);
    expect(second.nextCursor).toBeNull();
  });

  it("rejects an invalid cursor instead of silently restarting the list", async () => {
    const repository = repositoryWith(3);

    await expect(
      new ListConversations(repository, tenantId).execute({ cursor: "no-es-un-cursor" }),
    ).rejects.toBeInstanceOf(InvalidCursorError);
  });

  it("does not include conversations from another tenant", async () => {
    const repository = new InMemoryConversationRepository();
    repository.addSummary(summary(1));
    repository.addSummary(summary(2, otherTenantId));

    const page = await new ListConversations(repository, tenantId).execute();

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.contact.tenantId).toBe(tenantId);
  });

  it("returns an empty list when the tenant has no conversations", async () => {
    const repository = new InMemoryConversationRepository();
    repository.addSummary(summary(1, otherTenantId));

    const page = await new ListConversations(repository, tenantId).execute();

    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });
});

describe("GetConversation", () => {
  it("returns a conversation that is not in the first page", async () => {
    const repository = repositoryWith(40);
    const list = new ListConversations(repository, tenantId);
    const firstPage = await list.execute({ limit: 10 });

    expect(firstPage.items.some((item) => item.conversation.id === "conversation-00")).toBe(false);

    const found = await new GetConversation(repository, tenantId).execute("conversation-00");

    expect(found?.conversation.id).toBe("conversation-00");
    expect(found?.contact.name).toBe("Contacto 0");
  });

  it("returns null for a conversation of another tenant", async () => {
    const repository = new InMemoryConversationRepository();
    repository.addSummary(summary(1, otherTenantId));

    await expect(
      new GetConversation(repository, tenantId).execute("conversation-01"),
    ).resolves.toBeNull();
  });
});
