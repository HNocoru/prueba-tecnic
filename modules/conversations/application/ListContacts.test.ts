import { describe, expect, it } from "vitest";
import { Contact } from "../domain/Contact";
import { ListContacts } from "./ListContacts";
import { InvalidCursorError } from "./pagination";
import { InMemoryContactRepository } from "../testing/InMemoryConversationRepository";

const tenantId = "00000000-0000-4000-8000-000000000001";

function contact(index: number): Contact {
  return new Contact({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    tenantId,
    waId: `521550000${String(index).padStart(4, "0")}`,
    phoneE164: null,
    name: `Contacto ${index}`,
    attributes: {},
    createdAt: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString(),
    redactedAt: null,
  });
}

function repositoryWith(count: number): InMemoryContactRepository {
  const repository = new InMemoryContactRepository();
  for (let index = 0; index < count; index++) {
    repository.add(contact(index));
  }
  return repository;
}

describe("ListContacts", () => {
  it("returns the first page ordered by creation descending", async () => {
    const page = await new ListContacts(repositoryWith(35)).execute(tenantId, { limit: 10 });

    expect(page.items).toHaveLength(10);
    expect(page.items[0]?.name).toBe("Contacto 34");
    expect(page.items[9]?.name).toBe("Contacto 25");
    expect(page.nextCursor).not.toBeNull();
  });

  it("returns the next page from the cursor and ends without a cursor", async () => {
    const list = new ListContacts(repositoryWith(15));
    const first = await list.execute(tenantId, { limit: 10 });
    const second = await list.execute(tenantId, { limit: 10, cursor: first.nextCursor });

    expect(second.items.map((item) => item.name)).toEqual([
      "Contacto 4",
      "Contacto 3",
      "Contacto 2",
      "Contacto 1",
      "Contacto 0",
    ]);
    expect(second.nextCursor).toBeNull();
  });

  it("rejects an invalid cursor", async () => {
    await expect(
      new ListContacts(repositoryWith(3)).execute(tenantId, { cursor: "not-base64" }),
    ).rejects.toBeInstanceOf(InvalidCursorError);
  });

  it("returns an empty page when the tenant has no contacts", async () => {
    const page = await new ListContacts(repositoryWith(0)).execute(tenantId);

    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });
});
