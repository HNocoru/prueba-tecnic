/**
 * API publica del modulo conversations.
 * La capa app solo importa desde este index: los casos de uso y entidades publicos.
 */
export { Contact } from "./domain/Contact";
export type { ContactRepository } from "./application/ContactRepository";
export { ListContacts } from "./application/ListContacts";
