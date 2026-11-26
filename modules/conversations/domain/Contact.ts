/**
 * Entidad de dominio: un contacto de WhatsApp dentro de un tenant.
 * Capa de dominio pura: sin dependencias de framework, infraestructura ni app.
 */

export class Contact {
  readonly id: string;
  readonly tenantId: string;
  readonly waId: string;
  readonly phoneE164: string | null;
  readonly name: string | null;
  readonly attributes: Record<string, unknown>;
  readonly createdAt: string;
  readonly redactedAt: string | null;

  constructor(input: {
    id: string;
    tenantId: string;
    waId: string;
    phoneE164: string | null;
    name: string | null;
    attributes: Record<string, unknown>;
    createdAt: string;
    redactedAt: string | null;
  }) {
    this.id = input.id;
    this.tenantId = input.tenantId;
    this.waId = input.waId;
    this.phoneE164 = input.phoneE164;
    this.name = input.name;
    this.attributes = input.attributes;
    this.createdAt = input.createdAt;
    this.redactedAt = input.redactedAt;
  }

  get isRedacted(): boolean {
    return this.redactedAt !== null;
  }
}
