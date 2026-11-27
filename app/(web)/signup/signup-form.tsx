"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { signupAction, type SignupState } from "./actions";

const INITIAL_STATE: SignupState = { error: null, fieldErrors: {} };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const businessNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const businessNameError = state.fieldErrors.businessName;
  const emailError = state.fieldErrors.email;
  const passwordError = state.fieldErrors.password;

  // Después de la respuesta del servidor, el foco vuelve al primer campo inválido.
  useEffect(() => {
    const firstInvalid = businessNameError
      ? businessNameRef.current
      : emailError
        ? emailRef.current
        : passwordError
          ? passwordRef.current
          : null;
    firstInvalid?.focus();
  }, [state, businessNameError, emailError, passwordError]);

  let status = "";
  if (state.error) {
    status = state.error;
  } else if (businessNameError || emailError || passwordError) {
    status = "Revisa los campos marcados.";
  } else if (pending) {
    status = "Creando cuenta…";
  }

  const inputClassName =
    "min-h-12 w-full rounded-2xl bg-surface px-4 text-sm text-text outline-none placeholder:text-text-2 focus-visible:ring-2 focus-visible:ring-accent aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive";

  return (
    <form
      action={formAction}
      noValidate
      aria-labelledby="signup-title"
      className="flex w-full flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="businessName" className="text-sm font-semibold text-text">
          Nombre del negocio
        </label>
        <input
          ref={businessNameRef}
          id="businessName"
          name="businessName"
          type="text"
          autoComplete="organization"
          placeholder="Café Aurora"
          aria-describedby="businessName-error"
          aria-invalid={Boolean(businessNameError)}
          className={inputClassName}
        />
        <p id="businessName-error" className="text-sm font-medium text-destructive empty:hidden">
          {businessNameError ?? ""}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="signup-email" className="text-sm font-semibold text-text">
          Correo electrónico
        </label>
        <input
          ref={emailRef}
          id="signup-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nombre@tunegocio.mx"
          aria-describedby="signup-email-error"
          aria-invalid={Boolean(emailError)}
          className={inputClassName}
        />
        <p id="signup-email-error" className="text-sm font-medium text-destructive empty:hidden">
          {emailError ?? ""}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="signup-password" className="text-sm font-semibold text-text">
          Contraseña
        </label>
        <div className="relative">
          <input
            ref={passwordRef}
            id="signup-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Al menos 12 caracteres"
            aria-describedby="signup-password-hint signup-password-error"
            aria-invalid={Boolean(passwordError)}
            className={`${inputClassName} pr-28`}
          />
          <button
            type="button"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            aria-controls="signup-password"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-1.5 top-1/2 inline-flex min-h-11 -translate-y-1/2 items-center rounded-full px-3 text-sm font-semibold text-accent hover:bg-soft"
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <p id="signup-password-hint" className="text-sm text-text-2">
          12 caracteres mínimo, con mayúscula, minúscula, número y símbolo.
        </p>
        <p id="signup-password-error" className="text-sm font-medium text-destructive empty:hidden">
          {passwordError ?? ""}
        </p>
      </div>

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="min-h-5 text-sm text-text-2"
      >
        {status}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-full bg-accent px-6 text-base font-semibold text-canvas transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
