import { describe, expect, it } from "vitest";

import {
  credentialsSchema,
  emailSchema,
  loginPasswordSchema,
  strongPasswordSchema,
} from "./credentials";

describe("Validación de Email (emailSchema)", () => {
  it("acepta correos válidos de diversos proveedores y dominios corporativos", () => {
    const validEmails = [
      "usuario@gmail.com",
      "test.user+tag@yahoo.com",
      "admin@outlook.com",
      "contacto@mi-empresa.com.mx",
      "dev@1to1ai.tech",
      "  user@domain.co  ", // debe hacer trim
    ];

    for (const email of validEmails) {
      const result = emailSchema.safeParse(email);
      expect(result.success, `Falló para: ${email}`).toBe(true);
      if (result.success) {
        expect(result.data).toBe(email.trim());
      }
    }
  });

  it("rechaza correos vacíos o en blanco", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
    expect(emailSchema.safeParse("   ").success).toBe(false);
  });

  it("rechaza correos sin @ o sin dominio válido", () => {
    const invalidEmails = [
      "sin-arroba.com",
      "@nodomain.com",
      "user@",
      "user@.",
      "user@dominio..com",
      "user with spaces@domain.com",
      "user@dom ain.com",
    ];

    for (const email of invalidEmails) {
      expect(emailSchema.safeParse(email).success, `Esperaba error para: ${email}`).toBe(false);
    }
  });

  it("rechaza correos que excedan la longitud máxima (RFC 5321 - 254 caracteres)", () => {
    const longLocal = "a".repeat(245);
    const tooLongEmail = `${longLocal}@example.com`; // 245 + 12 = 257 chars
    expect(emailSchema.safeParse(tooLongEmail).success).toBe(false);
  });
});

describe("Validación de Contraseña de Login (loginPasswordSchema)", () => {
  it("acepta cualquier contraseña no vacía sin exigir complejidad", () => {
    // Si un usuario antiguo tiene una contraseña simple, no debe bloquearse en login
    expect(loginPasswordSchema.safeParse("simple").success).toBe(true);
    expect(loginPasswordSchema.safeParse("1234").success).toBe(true);
    expect(loginPasswordSchema.safeParse("Strong!P@ssw0rd2026").success).toBe(true);
  });

  it("rechaza contraseña vacía", () => {
    expect(loginPasswordSchema.safeParse("").success).toBe(false);
  });
});

describe("Validación de Contraseña Fuerte para Alta/Cambio (strongPasswordSchema)", () => {
  it("acepta contraseñas que cumplen todos los criterios de fuerza", () => {
    const validPasswords = [
      "Admin#2026Secure",
      "Super$Secret123!",
      "Valid-Password999",
      "c0mPlex!ty_Test",
    ];

    for (const pass of validPasswords) {
      expect(strongPasswordSchema.safeParse(pass).success, `Falló para: ${pass}`).toBe(true);
    }
  });

  it("rechaza contraseñas con menos de 12 caracteres", () => {
    expect(strongPasswordSchema.safeParse("Short1!Aa").success).toBe(false);
  });

  it("rechaza si falta mayúscula", () => {
    expect(strongPasswordSchema.safeParse("nocaps#1234567").success).toBe(false);
  });

  it("rechaza si falta minúscula", () => {
    expect(strongPasswordSchema.safeParse("NOLOWER#1234567").success).toBe(false);
  });

  it("rechaza si falta número", () => {
    expect(strongPasswordSchema.safeParse("NoDigits!HereAtAll").success).toBe(false);
  });

  it("rechaza si falta símbolo/carácter especial", () => {
    expect(strongPasswordSchema.safeParse("NoSpecialChars1234").success).toBe(false);
  });
});

describe("Validación de Credenciales de Login (credentialsSchema)", () => {
  it("valida objeto con email y contraseña correctos", () => {
    const result = credentialsSchema.safeParse({
      email: "  admin@test.com  ",
      password: "any-password",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("admin@test.com");
      expect(result.data.password).toBe("any-password");
    }
  });

  it("falla si el email es inválido", () => {
    const result = credentialsSchema.safeParse({
      email: "invalid-email",
      password: "any-password",
    });
    expect(result.success).toBe(false);
  });

  it("falla si la contraseña está vacía", () => {
    const result = credentialsSchema.safeParse({
      email: "admin@test.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
