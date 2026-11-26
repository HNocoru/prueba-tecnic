import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifica X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(cuerpo crudo, app secret). */
export function verifySignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): boolean {
  if (!header) return false;
  const expected = Buffer.from(
    `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`,
  );
  const received = Buffer.from(header);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}

/** Handshake GET de Meta: devuelve el challenge si el modo y el token son correctos, si no null. */
export function verifyHandshake(params: URLSearchParams, verifyToken: string): string | null {
  const challenge = params.get("hub.challenge");
  if (params.get("hub.mode") !== "subscribe" || !challenge) return null;
  const received = Buffer.from(params.get("hub.verify_token") ?? "");
  const expected = Buffer.from(verifyToken);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  return challenge;
}
