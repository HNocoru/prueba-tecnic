export interface OpenRequest {
  readonly id: string;
  readonly title: string;
  readonly status: "pending" | "in_progress";
  readonly amount: number | null;
}

export interface RequestWriteInput {
  readonly tenantId: string;
  readonly contactId: string;
  readonly conversationId: string;
  readonly action: "create" | "update";
  readonly requestId?: string;
  readonly title: string;
  readonly status: "pending" | "in_progress" | "cancelled";
  readonly amount: number | null;
}

export interface RequestWriter {
  listOpenRequests(tenantId: string, contactId: string): Promise<OpenRequest[]>;
  apply(input: RequestWriteInput): Promise<void>;
}
