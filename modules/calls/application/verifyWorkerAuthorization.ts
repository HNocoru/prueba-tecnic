import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Compara el Bearer del worker en tiempo constante. Se hashean ambos valores antes de
 * comparar para no filtrar la longitud del token por el tiempo de respuesta.
 */
export function verifyWorkerAuthorization(header: string | null, expectedToken: string): boolean {
  if (!header || !expectedToken) return false;

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  const provided = createHash("sha256").update(token).digest();
  const expected = createHash("sha256").update(expectedToken).digest();
  return timingSafeEqual(provided, expected);
}
