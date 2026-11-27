/**
 * API pública del módulo auth.
 * La capa app y el proxy solo importan desde este index.
 */
export {
  credentialsSchema,
  emailSchema,
  loginFieldErrors,
  loginPasswordSchema,
  strongPasswordSchema,
} from "./application/credentials";
export type { LoginFieldErrors } from "./application/credentials";
export { getAuthRedirect } from "./domain/auth-redirect";
export { getRequireUserRedirect } from "./domain/require-user-redirect";
export { VERIFIED_USER_HEADER } from "./domain/verified-user";
export { getVerifiedUserId } from "./application/verified-user";
export { requireUser, signInWithPassword, signOut } from "./application/auth";
export type { AuthResult, Credentials } from "./application/auth";
export { createProxyClient } from "./infrastructure/proxy";
export type { ProxySupabaseClient } from "./infrastructure/proxy";
