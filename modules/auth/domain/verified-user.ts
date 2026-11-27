/**
 * Cabecera interna con el id de usuario que el proxy ya verificó contra Supabase.
 * El proxy la sobrescribe (o elimina) en cada petición antes de llegar a la app;
 * nunca debe confiarse en un valor enviado por el cliente.
 */
export const VERIFIED_USER_HEADER = "x-verified-user-id";
