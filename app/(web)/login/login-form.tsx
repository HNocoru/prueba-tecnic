"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction, type LoginState } from "./actions";

const INITIAL_STATE: LoginState = { error: null, fieldErrors: {} };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const emailError = state.fieldErrors.email;
  const passwordError = state.fieldErrors.password;

  // Después de la respuesta del servidor, el foco vuelve al primer campo inválido.
  useEffect(() => {
    if (!state.fieldErrors.email && !state.fieldErrors.password) {
      return;
    }

    const firstInvalid = state.fieldErrors.email ? emailRef.current : passwordRef.current;
    firstInvalid?.focus();
  }, [state]);

  let status = "";
  if (state.error) {
    status = state.error;
  } else if (emailError || passwordError) {
    status = "Revisa los campos marcados.";
  } else if (pending) {
    status = "Entrando…";
  }

  const inputClassName =
    "min-h-12 rounded-2xl border-0 bg-surface px-4 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive";

  return (
    <form
      action={formAction}
      noValidate
      aria-labelledby="login-title"
      className="flex w-full flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="font-semibold">
          Correo electrónico
        </Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nombre@tunegocio.mx"
          aria-describedby="email-error"
          aria-invalid={Boolean(emailError)}
          className={inputClassName}
        />
        <p id="email-error" className="text-sm font-medium text-destructive empty:hidden">
          {emailError ?? ""}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="font-semibold">
          Contraseña
        </Label>
        <div className="relative">
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            aria-describedby="password-error"
            aria-invalid={Boolean(passwordError)}
            className={`${inputClassName} pr-28`}
          />
          <Button
            type="button"
            variant="ghost"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            aria-controls="password"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3"
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
        <p id="password-error" className="text-sm font-medium text-destructive empty:hidden">
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

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
