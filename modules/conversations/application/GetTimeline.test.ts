import { describe, expect, it } from "vitest";

import { Contact } from "../domain/Contact";
import type { CallEntry, MessageEntry } from "../domain/Timeline";
import { InMemoryConversationRepository } from "../testing/InMemoryConversationRepository";
import { GetTimeline } from "./GetTimeline";

const tenantId = "00000000-0000-4000-8000-000000000001";
const conversationId = "conversation-1";

function message(id: string, at: string, body: string): MessageEntry {
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

function call(id: string, at: string, outcome: CallEntry["outcome"]): CallEntry {
  return {
    type: "call",
    id,
    conversationId,
    startedAt: at,
    endedAt: at,
    durationSeconds: 42,
    outcome,
    summary: "Resumen de la llamada",
    at,
  };
}

function repositoryWith(entries: (MessageEntry | CallEntry)[]): InMemoryConversationRepository {
  const repository = new InMemoryConversationRepository();
  repository.addContact(
    new Contact({
      id: "contact-1",
      tenantId,
      waId: "5215500000001",
      phoneE164: "+5215500000001",
      name: "Ana",
      attributes: {},
      createdAt: "2026-11-01T10:00:00Z",
      redactedAt: null,
    }),
    conversationId,
  );
  entries.forEach((entry) => repository.addEntry(entry));
  return repository;
}

describe("GetTimeline", () => {
  it("merges messages and calls in chronological order", async () => {
    const repository = repositoryWith([
      call("c1", "2026-11-24T10:05:00Z", "completed"),
      message("m1", "2026-11-24T10:00:00Z", "Hola"),
      message("m2", "2026-11-24T10:10:00Z", "Adiós"),
    ]);

    const result = await new GetTimeline(repository, tenantId).execute(conversationId);

    expect(result.map((entry) => [entry.type, entry.id])).toEqual([
      ["message", "m1"],
      ["call", "c1"],
      ["message", "m2"],
    ]);
  });

  it("returns only messages when the filter is messages", async () => {
    const repository = repositoryWith([
      message("m1", "2026-11-24T10:00:00Z", "Hola"),
      call("c1", "2026-11-24T10:05:00Z", "completed"),
    ]);

    const result = await new GetTimeline(repository, tenantId).execute(conversationId, "messages");

    expect(result.map((entry) => entry.id)).toEqual(["m1"]);
  });

  it("returns only calls when the filter is calls", async () => {
    const repository = repositoryWith([
      message("m1", "2026-11-24T10:00:00Z", "Hola"),
      call("c1", "2026-11-24T10:05:00Z", "missed"),
    ]);

    const result = await new GetTimeline(repository, tenantId).execute(conversationId, "calls");

    expect(result.map((entry) => entry.id)).toEqual(["c1"]);
  });

  it("returns an empty timeline when the conversation has no entries", async () => {
    const repository = repositoryWith([]);

    await expect(new GetTimeline(repository, tenantId).execute(conversationId)).resolves.toEqual(
      [],
    );
  });
});
