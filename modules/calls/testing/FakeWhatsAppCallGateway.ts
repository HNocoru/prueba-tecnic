import type { AcceptCallInput, WhatsAppCallGateway } from "../application/ports";

/** Puerto falso del Connector de LiveKit: registra las llamadas y puede fallar a demanda. */
export class FakeWhatsAppCallGateway implements WhatsAppCallGateway {
  readonly accepts: AcceptCallInput[] = [];
  readonly disconnects: string[] = [];
  failAccept: Error | null = null;
  failDisconnect: Error | null = null;

  async accept(input: AcceptCallInput): Promise<void> {
    if (this.failAccept) throw this.failAccept;
    this.accepts.push(input);
  }

  async disconnect(waCallId: string): Promise<void> {
    if (this.failDisconnect) throw this.failDisconnect;
    this.disconnects.push(waCallId);
  }
}
