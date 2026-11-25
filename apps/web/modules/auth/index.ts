/**
 * API pública del módulo auth.
 * La capa app y el proxy solo importan desde este index.
 */
export { getAuthRedirect } from "./domain/auth-redirect";
export { credentialsSchema, signInWithPassword, signOut } from "./application/auth";
export type { AuthResult, Credentials } from "./application/auth";
export { createProxyClient } from "./infrastructure/proxy";
export type { ProxySupabaseClient } from "./infrastructure/proxy";
