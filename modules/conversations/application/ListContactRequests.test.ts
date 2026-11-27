import { describe, expect, it } from "vitest";

import { Contact } from "../domain/Contact";
import type { ContactRequest, RequestStatus } from "../domain/Request";
import { InMemoryConversationRepository } from "../testing/InMemoryConversationRepository";
import { ListContactRequests } from "./ListContactRequests";

const tenantId = "00000000-0000-4000-8000-000000000001";
const otherTenantId = "00000000-0000-4000-8000-000000000002";
const contactId = "contact-1";

function contact(id: string, owner = tenantId): Contact {
  return new Contact({
    id,
    tenantId: owner,
    waId: "5215500000001",
    phoneE164: "+5215500000001",
    name: "Ana",
    attributes: {},
    createdAt: "2026-11-01T10:00:00Z",
    redactedAt: null,
  });
}

function request(
  id: string,
  status: RequestStatus,
  createdAt: string,
  owner = tenantId,
  forContact = contactId,
): ContactRequest {
  return {
    id,
    tenantId: owner,
    contactId: forContact,
    conversationId: null,
    title: `Solicitud ${id}`,
    status,
    amount: 250,
    source: "manual",
    createdAt,
    updatedAt: createdAt,
  };
}

function repositoryWith(requests: ContactRequest[]): InMemoryConversationRepository {
  const repository = new InMemoryConversationRepository();
  repository.addContact(contact(contactId));
  requests.forEach((entry) => repository.addRequest(entry));
  return repository;
}

describe("ListContactRequests", () => {
  it("returns the contact requests from newest to oldest", async () => {
    const repository = repositoryWith([
      request("r1", "pending", "2026-11-20T10:00:00Z"),
      request("r2", "completed", "2026-11-24T10:00:00Z"),
      request("r3", "in_progress", "2026-11-22T10:00:00Z"),
    ]);

    const result = await new ListContactRequests(repository, tenantId).execute(contactId);

    expect(result.map((entry) => entry.id)).toEqual(["r2", "r3", "r1"]);
  });

  it("does not leak requests from another tenant", async () => {
    const repository = repositoryWith([
      request("mine", "pending", "2026-11-20T10:00:00Z"),
      request("theirs", "completed", "2026-11-24T10:00:00Z", otherTenantId),
    ]);

    const result = await new ListContactRequests(repository, tenantId).execute(contactId);

    expect(result.map((entry) => entry.id)).toEqual(["mine"]);
  });

  it("ignores requests of another contact", async () => {
    const repository = repositoryWith([
      request("mine", "pending", "2026-11-20T10:00:00Z"),
      request("other", "completed", "2026-11-24T10:00:00Z", tenantId, "contact-2"),
    ]);

    const result = await new ListContactRequests(repository, tenantId).execute(contactId);

    expect(result.map((entry) => entry.id)).toEqual(["mine"]);
  });

  it("returns an empty list when the contact has no requests", async () => {
    const result = await new ListContactRequests(repositoryWith([]), tenantId).execute(contactId);

    expect(result).toEqual([]);
  });
});
