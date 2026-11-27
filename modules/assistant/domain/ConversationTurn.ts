/** Turno de la conversación tal como se entrega al LLM. */
export interface ConversationTurn {
  readonly role: "user" | "assistant";
  readonly body: string;
}
