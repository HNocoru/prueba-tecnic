import { describe, expect, it } from "vitest";

import type { BusinessContext } from "../domain/BusinessContext";
import type { StoredInboundMessage } from "../domain/Reply";
import type { ConversationTurn } from "../domain/ConversationTurn";
import { TEXT_ONLY_REPLY } from "../domain/Reply";
import type {
  BusinessContextReader,
  ConversationHistoryReader,
  InboundMessageReader,
  LlmPort,
  MessageWriter,
  ReplyEventStore,
  RequestWriter,
  WhatsAppSenderPort,
} from "./ports";
import { MAX_REPLIES_PER_HOUR, ReplyToInboundMessage } from "./ReplyToInboundMessage";

const TENANT = "tenant-A";
const OTHER_TENANT = "tenant-B";
const CONV = "conv-A";
const MSG = "wamid.TEXT1";
const CUSTOMER_TEXT = "¿Abren el sábado?";

const context = (name: string): BusinessContext => ({
  name,
  description: "Café de especialidad",
  address: null,
  timezone: "America/Mexico_City",
  policies: null,
  contactPhone: "+525599887766",
  hours: [],
  catalog: [],
  faqs: [],
  assistant: {
    name: "Aurora",
    tone: "cercano",
    language: "es-MX",
    greeting: null,
    escalationMessage: "Te paso con una persona",
  },
});

const stored = (overrides: Partial<StoredInboundMessage> = {}): StoredInboundMessage => ({
  id: MSG,
  direction: "inbound",
  kind: "text",
  body: CUSTOMER_TEXT,
  waId: "5215512345678",
  phoneE164: "+525512345678",
  contactId: "contact-A",
  ...overrides,
});

class FakeInbound implements InboundMessageReader {
  readonly calls: string[] = [];
  constructor(public message: StoredInboundMessage | null = stored()) {}
  async findInbound(tenantId: string, id: string) {
    this.calls.push(tenantId);
    return this.message !== null && id === this.message.id ? this.message : null;
  }
}

class FakeBusiness implements BusinessContextReader {
  readonly calls: string[] = [];
  constructor(private readonly contexts: Record<string, BusinessContext>) {}
  async getBusinessContext(tenantId: string) {
    this.calls.push(tenantId);
    const found = this.contexts[tenantId];
    if (!found) throw new Error(`tenant desconocido: ${tenantId}`);
    return found;
  }
}

class FakeHistory implements ConversationHistoryReader {
  readonly calls: string[] = [];
  turns: ConversationTurn[] = [];
  limit = 0;
  async loadHistory(tenantId: string, _conversationId: string, limit: number) {
    this.calls.push(tenantId);
    this.limit = limit;
    return this.turns.slice(-limit);
  }
}

class FakeLlm implements LlmPort {
  readonly calls: { system: string; history: ConversationTurn[] }[] = [];
  reply = "Sí, abrimos a las 9.";
  error: Error | null = null;
  async generate(system: string, history: ConversationTurn[]) {
    this.calls.push({ system, history });
    if (this.error) throw this.error;
    return this.reply;
  }
}

class FakeSender implements WhatsAppSenderPort {
  readonly calls: { tenantId: string; to: string; body: string }[] = [];
  error: Error | null = null;
  async sendText(tenantId: string, to: string, body: string) {
    this.calls.push({ tenantId, to, body });
    if (this.error) throw this.error;
    return "wamid.OUT1";
  }
}

class FakeMessages implements MessageWriter {
  readonly outbound: { tenantId: string; conversationId: string; body: string; wamid: string }[] =
    [];
  readonly counts: string[] = [];
  recentCount = 0;
  async countRecentOutbound(tenantId: string, conversationId: string) {
    this.counts.push(`${tenantId}:${conversationId}`);
    return this.recentCount;
  }
  async insertOutbound(
    tenantId: string,
    conversationId: string,
    m: { body: string; wamid: string },
  ) {
    this.outbound.push({ tenantId, conversationId, body: m.body, wamid: m.wamid });
  }
}

class FakeEvents implements ReplyEventStore {
  readonly claims = new Set<string>();
  readonly failed: { tenantId: string; id: string; error: string }[] = [];
  readonly processed: { tenantId: string; id: string }[] = [];
  async tryClaim(tenantId: string, id: string) {
    const key = `${tenantId}:${id}`;
    if (this.claims.has(key)) return false;
    this.claims.add(key);
    return true;
  }
  async markFailed(tenantId: string, id: string, error: string) {
    this.failed.push({ tenantId, id, error });
  }
  async markProcessed(tenantId: string, id: string) {
    this.processed.push({ tenantId, id });
  }
}

class FakeRequestWriter implements RequestWriter {
  open: { id: string; title: string; status: "pending" | "in_progress"; amount: number | null }[] =
    [];
  applied: unknown[] = [];
  async listOpenRequests() {
    return this.open;
  }
  async apply(input: unknown) {
    this.applied.push(input);
  }
}

const setup = () => {
  const inbound = new FakeInbound();
  const business = new FakeBusiness({
    [TENANT]: context("Café Aurora"),
    [OTHER_TENANT]: context("Otro Negocio"),
  });
  const history = new FakeHistory();
  history.turns = [{ role: "assistant", body: "¡Hola!" }];
  const llm = new FakeLlm();
  const sender = new FakeSender();
  const messages = new FakeMessages();
  const events = new FakeEvents();
  const useCase = new ReplyToInboundMessage({
    inbound,
    business,
    history,
    llm,
    sender,
    messages,
    events,
  });
  return { useCase, inbound, business, history, llm, sender, messages, events };
};

describe("ReplyToInboundMessage", () => {
  it("genera, envía y guarda el outbound con el wamid de Graph", async () => {
    const { useCase, sender, messages, events } = setup();
    await expect(useCase.execute(TENANT, CONV, MSG)).resolves.toEqual({
      status: "sent",
      wamid: "wamid.OUT1",
    });
    expect(sender.calls).toEqual([
      { tenantId: TENANT, to: "5215512345678", body: "Sí, abrimos a las 9." },
    ]);
    expect(messages.outbound).toEqual([
      { tenantId: TENANT, conversationId: CONV, body: "Sí, abrimos a las 9.", wamid: "wamid.OUT1" },
    ]);
    expect(events.processed).toEqual([{ tenantId: TENANT, id: MSG }]);
  });

  it("idempotencia: el mismo wamid nunca genera dos respuestas", async () => {
    const { useCase, sender, messages } = setup();
    await useCase.execute(TENANT, CONV, MSG);
    await expect(useCase.execute(TENANT, CONV, MSG)).resolves.toEqual({
      status: "skipped",
      reason: "duplicate",
    });
    expect(sender.calls).toHaveLength(1);
    expect(messages.outbound).toHaveLength(1);
  });

  it("no responde mensajes outbound", async () => {
    const { useCase, inbound, llm, sender } = setup();
    inbound.message = stored({ direction: "outbound" });
    await expect(useCase.execute(TENANT, CONV, MSG)).resolves.toEqual({
      status: "skipped",
      reason: "outbound",
    });
    expect(llm.calls).toHaveLength(0);
    expect(sender.calls).toHaveLength(0);
  });

  it("no responde ecos del propio número", async () => {
    const { useCase, inbound, sender } = setup();
    inbound.message = stored({ waId: "525599887766" });
    await expect(useCase.execute(TENANT, CONV, MSG)).resolves.toEqual({
      status: "skipped",
      reason: "self_echo",
    });
    expect(sender.calls).toHaveLength(0);
  });

  it("audio/imagen: respuesta fija corta sin llamar al LLM", async () => {
    const { useCase, inbound, llm, sender } = setup();
    inbound.message = stored({ kind: "audio", body: null });
    await expect(useCase.execute(TENANT, CONV, MSG)).resolves.toEqual({
      status: "sent",
      wamid: "wamid.OUT1",
    });
    expect(llm.calls).toHaveLength(0);
    expect(sender.calls[0].body).toBe(TEXT_ONLY_REPLY);
  });

  it(`tope de ${MAX_REPLIES_PER_HOUR} respuestas por hora y conversación`, async () => {
    const { useCase, messages, sender } = setup();
    messages.recentCount = MAX_REPLIES_PER_HOUR;
    await expect(useCase.execute(TENANT, CONV, MSG)).resolves.toEqual({
      status: "skipped",
      reason: "rate_limited",
    });
    expect(sender.calls).toHaveLength(0);
    expect(messages.counts).toEqual([`${TENANT}:${CONV}`]);
  });

  it("el texto del cliente va como usuario; el system trae solo el negocio", async () => {
    const { useCase, llm } = setup();
    llm.calls.length = 0;
    await useCase.execute(TENANT, CONV, MSG);
    expect(llm.calls).toHaveLength(1);
    expect(llm.calls[0].system).toContain("Café Aurora");
    expect(llm.calls[0].system).not.toContain(CUSTOMER_TEXT);
    expect(llm.calls[0].system).not.toContain("Otro Negocio");
    expect(llm.calls[0].history).toEqual([
      { role: "assistant", body: "¡Hola!" },
      { role: "user", body: CUSTOMER_TEXT },
    ]);
  });

  it("fallo del LLM: no envía nada y registra el error redactado en el evento", async () => {
    const { useCase, llm, sender, messages, events } = setup();
    llm.error = new Error("Bearer sk-ant-SECRETO-LLM rechazado");
    const result = await useCase.execute(TENANT, CONV, MSG);
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.reason).toBe("llm");
    expect(sender.calls).toHaveLength(0);
    expect(messages.outbound).toHaveLength(0);
    expect(events.failed).toHaveLength(1);
    expect(events.failed[0].error).toContain("LLM");
    expect(events.failed[0].error).not.toContain("SECRETO-LLM");
  });

  it("sin API key: falla sin lanzar y deja el error en el evento", async () => {
    const { useCase, llm, sender, events } = setup();
    llm.error = new Error("GROQ_API_KEY no configurado");
    const result = await useCase.execute(TENANT, CONV, MSG);
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.reason).toBe("llm");
    expect(sender.calls).toHaveLength(0);
    expect(events.failed[0].error).toContain("GROQ_API_KEY");
  });

  it("fallo de Graph: no guarda outbound y el error no filtra el token", async () => {
    const { useCase, sender, messages, events } = setup();
    sender.error = new Error("Bearer SECRETO-GRAPH rechazado");
    const result = await useCase.execute(TENANT, CONV, MSG);
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.reason).toBe("send");
    expect(messages.outbound).toHaveLength(0);
    expect(events.failed).toHaveLength(1);
    expect(events.failed[0].error).not.toContain("SECRETO-GRAPH");
    expect(events.failed[0].error).toContain("Graph");
  });

  it("multi-tenant: todas las lecturas y escrituras usan el tenant explícito", async () => {
    const { useCase, inbound, business, history, sender, messages, events, llm } = setup();
    await useCase.execute(TENANT, CONV, MSG);
    expect(inbound.calls).toEqual([TENANT]);
    expect(business.calls).toEqual([TENANT]);
    expect(history.calls).toEqual([TENANT]);
    expect(llm.calls[0].system).not.toContain("Otro Negocio");
    expect(sender.calls[0].tenantId).toBe(TENANT);
    expect(messages.outbound[0].tenantId).toBe(TENANT);
    expect(events.processed[0].tenantId).toBe(TENANT);
  });
});

it("clasifica y crea solicitud ai sin romper la respuesta ya enviada", async () => {
  const inbound = new FakeInbound();
  const business = new FakeBusiness({
    [TENANT]: {
      ...context("Café Aurora"),
      catalog: [
        {
          kind: "service",
          name: "Corte de cabello",
          description: null,
          price: 250,
          currency: "MXN",
        },
      ],
    },
    [OTHER_TENANT]: context("Otro Negocio"),
  });
  const history = new FakeHistory();
  const llm = new FakeLlm();
  llm.generate = async (system: string) => {
    if (system.includes("clasificador interno")) {
      return '{"action":"create","title":"Corte de cabello","status":"pending"}';
    }
    return "Sí, te ayudo.";
  };
  const sender = new FakeSender();
  const messages = new FakeMessages();
  const events = new FakeEvents();
  const requests = new FakeRequestWriter();
  const useCase = new ReplyToInboundMessage({
    inbound,
    business,
    history,
    llm,
    sender,
    messages,
    events,
    requests,
  });
  const result = await useCase.execute(TENANT, CONV, MSG);
  expect(result.status).toBe("sent");
  expect(requests.applied).toEqual([
    {
      tenantId: TENANT,
      contactId: "contact-A",
      conversationId: CONV,
      action: "create",
      title: "Corte de cabello",
      status: "pending",
      amount: 250,
    },
  ]);
});

it("JSON inválido de clasificación = none y no rompe la respuesta", async () => {
  const inbound = new FakeInbound();
  const business = new FakeBusiness({
    [TENANT]: context("Café Aurora"),
    [OTHER_TENANT]: context("Otro Negocio"),
  });
  const history = new FakeHistory();
  const llm = new FakeLlm();
  llm.generate = async (system: string) =>
    system.includes("clasificador interno") ? "{bad json" : "Ok";
  const sender = new FakeSender();
  const messages = new FakeMessages();
  const events = new FakeEvents();
  const requests = new FakeRequestWriter();
  const useCase = new ReplyToInboundMessage({
    inbound,
    business,
    history,
    llm,
    sender,
    messages,
    events,
    requests,
  });
  await expect(useCase.execute(TENANT, CONV, MSG)).resolves.toMatchObject({ status: "sent" });
  expect(requests.applied).toEqual([]);
});

it("acción prohibida completed no escribe solicitud", async () => {
  const inbound = new FakeInbound();
  const business = new FakeBusiness({
    [TENANT]: context("Café Aurora"),
    [OTHER_TENANT]: context("Otro Negocio"),
  });
  const history = new FakeHistory();
  const llm = new FakeLlm();
  llm.generate = async (system: string) =>
    system.includes("clasificador interno")
      ? '{"action":"update","title":"Corte","status":"completed"}'
      : "Ok";
  const sender = new FakeSender();
  const messages = new FakeMessages();
  const events = new FakeEvents();
  const requests = new FakeRequestWriter();
  requests.open = [{ id: "r1", title: "Corte", status: "pending", amount: null }];
  const useCase = new ReplyToInboundMessage({
    inbound,
    business,
    history,
    llm,
    sender,
    messages,
    events,
    requests,
  });
  await expect(useCase.execute(TENANT, CONV, MSG)).resolves.toMatchObject({ status: "sent" });
  expect(requests.applied).toEqual([]);
});
