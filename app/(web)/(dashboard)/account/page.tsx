import Link from "next/link";

import { accountSummary } from "@/components/atoms/p5-presentation";
import { P5Icon } from "@/components/atoms/P5Icon";
import { P5PageHeader } from "@/components/molecules/P5PageHeader";
import { P5SectionCard } from "@/components/molecules/P5SectionCard";
import { P5StateNotice } from "@/components/molecules/P5StateNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/shared/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return (
      <>
        <P5PageHeader title="Cuenta" description="Tus datos de acceso y tu contraseña." />
        <P5StateNotice
          tone="error"
          title="No pudimos cargar tu cuenta"
          description="Tu sesión sigue abierta. Inténtalo de nuevo en un momento."
          action={
            <Link
              href="/account"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-accent"
            >
              Reintentar
            </Link>
          }
        />
      </>
    );
  }

  const metadata = data.user.user_metadata as { full_name?: unknown; name?: unknown };
  const displayName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;
  const account = accountSummary(data.user.email ?? "", displayName);

  return (
    <>
      <P5PageHeader title="Cuenta" description="Tus datos de acceso y tu contraseña." />

      <div className="flex flex-col gap-5">
        <P5SectionCard title="Tus datos" description="Con este correo inicias sesión." icon="user">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-soft text-lg font-semibold text-accent">
              {account.initials}
            </span>
            <div className="min-w-0">
              <p
                className="truncate text-xl font-semibold text-text"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {account.name}
              </p>
              <p className="mt-1 break-all text-sm text-text-2">{account.email}</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface p-3">
              <dt className="text-xs text-text-2">Correo electrónico</dt>
              <dd className="mt-1 break-all text-sm font-medium text-text">{account.email}</dd>
            </div>
            <div className="rounded-2xl bg-surface p-3">
              <dt className="text-xs text-text-2">Nombre</dt>
              <dd className="mt-1 break-words text-sm font-medium text-text">{account.name}</dd>
            </div>
          </dl>
        </P5SectionCard>

        <P5SectionCard
          title="Datos de acceso"
          description="Las opciones de edición llegarán próximamente."
          icon="mail"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-surface p-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-text">Guardar datos</h3>
                <p className="mt-1 text-sm text-text-2">
                  Pronto podrás actualizar tus datos desde aquí.
                </p>
              </div>
              <Badge>Próximamente</Badge>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-surface p-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-text">Cambiar contraseña</h3>
                <p className="mt-1 text-sm text-text-2">
                  Elige una contraseña que no uses en otro sitio.
                </p>
              </div>
              <Badge>Próximamente</Badge>
            </div>
          </div>
        </P5SectionCard>

        <P5SectionCard title="Cerrar sesión" icon="logout">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xl text-sm text-text-2">
              Saldrás de este dispositivo. Para volver a entrar necesitarás tu correo y tu
              contraseña.
            </p>
            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="secondary" size="sm">
                <P5Icon name="logout" className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </form>
          </div>
        </P5SectionCard>
      </div>
    </>
  );
}
