/**
 * Decide la redirección de una zona protegida según haya usuario verificado.
 * Devuelve la ruta destino o null si se puede continuar.
 */
export function getRequireUserRedirect(hasUser: boolean): string | null {
  return hasUser ? null : "/login";
}
