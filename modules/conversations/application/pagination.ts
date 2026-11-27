/**
 * Paginación por cursor (keyset) compartida por conversaciones, mensajes y contactos.
 * El cursor es opaco para la UI y lleva los dos campos del orden: fecha e id.
 */

/** Posición ya resuelta dentro de una lista ordenada. */
export interface PageCursor {
  readonly at: string;
  readonly id: string;
}

/** Petición de página tal como la recibe un caso de uso (cursor aún codificado). */
export interface CursorPageRequest {
  readonly cursor?: string | null;
  readonly limit?: number;
}

/** Página ya codificada para la capa de presentación. */
export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

/** Opciones ya decodificadas que recibe un adaptador. */
export interface CursorPageOptions {
  readonly after: PageCursor | null;
  readonly limit: number;
}

/** Resultado de un adaptador antes de codificar el siguiente cursor. */
export interface CursorPageResult<T> {
  readonly items: readonly T[];
  readonly hasMore: boolean;
}

export class InvalidCursorError extends Error {
  constructor() {
    super("Cursor inválido");
    this.name = "InvalidCursorError";
  }
}

export const DEFAULT_PAGE_SIZE = 30;
export const MESSAGE_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Convierte el cursor a un token opaco y seguro para URL. */
export function encodeCursor(cursor: PageCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/** Decodifica el cursor; cualquier forma inválida lanza InvalidCursorError. */
export function decodeCursor(value?: string | null): PageCursor | null {
  if (!value) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new InvalidCursorError();
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as PageCursor).at !== "string" ||
    typeof (parsed as PageCursor).id !== "string" ||
    (parsed as PageCursor).at.length === 0 ||
    (parsed as PageCursor).id.length === 0 ||
    Number.isNaN(Date.parse((parsed as PageCursor).at))
  ) {
    throw new InvalidCursorError();
  }

  return { at: (parsed as PageCursor).at, id: (parsed as PageCursor).id };
}

/** Normaliza el límite pedido por la UI para no permitir páginas enormes. */
export function normalizeLimit(limit: number | undefined, fallback: number): number {
  if (!limit || !Number.isFinite(limit)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_PAGE_SIZE);
}

/** `true` si (at, id) queda estrictamente después del cursor en orden descendente. */
export function isAfterCursor(at: string, id: string, cursor: PageCursor): boolean {
  return at < cursor.at || (at === cursor.at && id < cursor.id);
}
