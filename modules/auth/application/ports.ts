/** Datos de alta de usuario; el password nunca se registra ni se devuelve. */
export type CreateAccountUserData = {
  email: string;
  password: string;
};

/** El tenant se crea siempre en el servidor, nunca desde datos del cliente. */
export type CreateTenantData = {
  name: string;
  slug: string;
};

/**
 * Frontera de salida para aprovisionar una cuenta completa.
 * Las operaciones de borrado existen para deshacer un alta parcial.
 */
export interface AccountProvisioner {
  createUser(data: CreateAccountUserData): Promise<string>;
  createTenant(data: CreateTenantData): Promise<string>;
  addMember(tenantId: string, userId: string): Promise<void>;
  deleteTenant(tenantId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}
