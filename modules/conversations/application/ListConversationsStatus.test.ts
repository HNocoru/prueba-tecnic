import { describe, expect, it } from "vitest";

import { Contact } from "../domain/Contact";
import type { ContactRequest, RequestStatus } from "../domain/Request";
import { InMemoryConversationRepository } from "../testing/InMemoryConversationRepository";
import { ListConversations } from "./ListConversations";

const tenantId = "00000000-0000-4000-8000-000000000001";
const contactId = "contact-1";

function request(id: string, status: RequestStatus, createdAt: string): ContactRequest {
  return {
    id,
    tenantId,
    contactId,
    conversationId: null,
    title: `Solicitud ${id}`,
    status,
    amount: null,
    source: "manual",
    createdAt,
    updatedAt: createdAt,
  };
}

function repositoryWith(requests: ContactRequest[]): InMemoryConversationRepository {
  const repository = new InMemoryConversationRepository();
  repository.addContact(
    new Contact({
      id: contactId,
      tenantId,
      waId: "5215500000001",
      phoneE164: "+5215500000001",
      name: "Ana",
      attributes: {},
      createdAt: "2026-11-01T10:00:00Z",
      redactedAt: null,
    }),
  );
  requests.forEach((entry) => repository.addRequest(entry));
  return repository;
}

describe("ListConversations request status", () => {
  it("exposes the most recent request of each contact as the chat status", async () => {
    const repository = repositoryWith([
      request("r1", "pending", "2026-11-20T10:00:00Z"),
      request("r2", "completed", "2026-11-24T10:00:00Z"),
    ]);

    const page = await new ListConversations(repository, tenantId).execute();

    expect(page.items[0]?.latestRequest?.status).toBe("completed");
    expect(page.items[0]?.latestRequest?.id).toBe("r2");
  });

  it("returns null when the contact has no requests", async () => {
    const page = await new ListConversations(repositoryWith([]), tenantId).execute();

    expect(page.items[0]?.latestRequest).toBeNull();
  });
});
