/** Conversación de un tenant, con la actividad más reciente ya resuelta. */
export interface Conversation {
  readonly id: string;
  readonly tenantId: string;
  readonly contactId: string;
  readonly lastActivityAt: string;
}
