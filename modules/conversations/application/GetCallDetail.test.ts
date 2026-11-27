import { describe, expect, it } from "vitest";

import { Contact } from "../domain/Contact";
import type { CallEntry } from "../domain/Timeline";
import type { CallTurn } from "../domain/CallDetail";
import { InMemoryConversationRepository } from "../testing/InMemoryConversationRepository";
import { GetCallDetail } from "./GetCallDetail";

const tenantId = "00000000-0000-4000-8000-000000000001";
const otherTenantId = "00000000-0000-4000-8000-000000000002";
const conversationId = "conversation-1";
const callId = "call-1";

function call(): CallEntry {
  return {
    type: "call",
    id: callId,
    conversationId,
    startedAt: "2026-11-24T10:00:00Z",
    endedAt: "2026-11-24T10:02:00Z",
    durationSeconds: 120,
    outcome: "completed",
    summary: "El cliente pidió una cotización.",
    at: "2026-11-24T10:00:00Z",
  };
}

function turn(id: string, position: number, owner = tenantId): CallTurn {
  return {
    id,
    tenantId: owner,
    callId,
    role: position % 2 === 0 ? "user" : "assistant",
    text: `Turno ${position}`,
    position,
  };
}

function repositoryWith(entries: CallTurn[], owner = tenantId): InMemoryConversationRepository {
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
  repository.addEntry(call());
  entries.forEach((entry) => repository.addTurn(entry));
  return repository;
}

describe("GetCallDetail", () => {
  it("returns the call with its turns ordered by position", async () => {
    const repository = repositoryWith([turn("t3", 3), turn("t1", 1), turn("t2", 2)]);

    const detail = await new GetCallDetail(repository, tenantId).execute(callId);

    expect(detail?.call.summary).toBe("El cliente pidió una cotización.");
    expect(detail?.turns.map((entry) => entry.id)).toEqual(["t1", "t2", "t3"]);
  });

  it("returns the call with an empty turn list when there is no transcript", async () => {
    const detail = await new GetCallDetail(repositoryWith([]), tenantId).execute(callId);

    expect(detail?.call.id).toBe(callId);
    expect(detail?.turns).toEqual([]);
  });

  it("returns null for a call of another tenant", async () => {
    const repository = repositoryWith([turn("t1", 1, otherTenantId)], otherTenantId);

    await expect(new GetCallDetail(repository, tenantId).execute(callId)).resolves.toBeNull();
  });

  it("returns null for a call that does not exist", async () => {
    const detail = await new GetCallDetail(repositoryWith([]), tenantId).execute("missing");

    expect(detail).toBeNull();
  });
});
