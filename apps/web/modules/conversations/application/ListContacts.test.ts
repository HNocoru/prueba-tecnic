import { describe, expect, it } from "vitest";
import { Contact } from "../domain/Contact";
import { ListContacts } from "./ListContacts";
import type { ContactRepository } from "./ContactRepository";

/**
 * Repositorio falso en memoria para pruebas unitarias de ListContacts.
 * No toca red ni base de datos.
 */
class InMemoryContactRepository implements ContactRepository {
  private readonly contacts: Contact[] = [];

  async listContacts(tenantId: string): Promise<Contact[]> {
    return this.contacts.filter((contact) => contact.tenantId === tenantId);
  }

  add(contact: Contact): void {
    this.contacts.push(contact);
  }
}

describe("ListContacts", () => {
  const tenantId = "00000000-0000-4000-8000-000000000001";

  it("returns the contacts for the tenant", async () => {
    const contact = new Contact({
      id: "00000000-0000-4000-8000-00000000000c",
      tenantId,
      waId: "5215500000001",
      phoneE164: "+5215500000001",
      name: "Ana",
      attributes: {},
      createdAt: "2026-11-24T00:00:00Z",
      redactedAt: null,
    });

    const repository = new InMemoryContactRepository();
    repository.add(contact);

    const listContacts = new ListContacts(repository);

    const result = await listContacts.execute(tenantId);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("00000000-0000-4000-8000-00000000000c");
  });

  it("returns an empty list when the tenant has no contacts", async () => {
    const listContacts = new ListContacts(new InMemoryContactRepository());

    await expect(listContacts.execute(tenantId)).resolves.toEqual([]);
  });
});
