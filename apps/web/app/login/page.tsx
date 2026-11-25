import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Iniciar sesión</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">Accede con tu email y contraseña.</p>
        <LoginForm />
      </section>
    </main>
  );
}
