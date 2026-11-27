/** El proveedor de identidad ya tiene un usuario con ese correo. */
export class DuplicateEmailError extends Error {
  readonly name = "DuplicateEmailError";

  constructor() {
    super("Email already registered");
  }
}
