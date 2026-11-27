# UI · Preparación para el rediseño (Tailwind + shadcn/ui + MUI)

Estado: **solo entorno**. No se ha cambiado código de la app.

## Versiones instaladas

| Paquete                              | Versión                     |
| ------------------------------------ | --------------------------- |
| next                                 | 16.4.6                      |
| react / react-dom                    | 19.3.0                      |
| tailwindcss / @tailwindcss/turbopack | 4.3.3                       |
| @mui/material                        | 9.6.0                       |
| @mui/icons-material                  | 9.6.0                       |
| @emotion/react / @emotion/styled     | 11.14.0 / 11.14.1           |
| @playwright/test                     | 1.65.1 (Chromium instalado) |
| eslint-plugin-jsx-a11y               | 6.10.2 (dev)                |

El proyecto ya tiene `components.json` (shadcn/ui). Conviven tres capas de UI: Tailwind,
shadcn/ui y ahora MUI. Conviene elegir **una** como base de componentes y usar la otra solo
donde aporte (p. ej. MUI para tablas o selectores complejos).

## Preflight de Tailwind v4 vs MUI

`app/globals.css` hace `@import "tailwindcss"`, que **incluye el preflight** (reset base en
`@layer base`). Conflictos posibles con MUI:

1. **Doble reset.** `CssBaseline` de MUI también normaliza `body`, tipografía y márgenes.
   Los dos juntos se pisan y cambian el aspecto según el orden de carga.
2. **Orden de inyección.** Emotion (MUI) inyecta sus `<style>` al final del `<head>`, y por eso
   gana a las utilidades de Tailwind aunque la especificidad sea igual: `className="p-2"` no
   puede sobrescribir un estilo de MUI.
3. **Botones, inputs y encabezados.** El preflight quita fondos, bordes y tamaños nativos; MUI
   asume sus propios estilos y puede verse "plano" o duplicado si no se coordinan.
4. **SSR con App Router.** Sin la caché de Emotion para el servidor hay parpadeo de estilos y
   riesgo de errores de hidratación.

## Cómo se resolverá

- **Base única: la de Tailwind.** No se usa `CssBaseline` (o, si hace falta, `ScopedCssBaseline`
  solo dentro de componentes MUI). La fuente y el color de fondo salen de Tailwind y del tema.
- **Capas CSS.** Declarar el orden `@layer theme, base, mui, components, utilities;` al inicio de
  `globals.css` y activar la opción de capas CSS de MUI para que sus estilos vivan en la capa
  `mui`, por debajo de las utilidades de Tailwind. Así `className` de Tailwind sí sobrescribe.
  **Por verificar** contra la documentación de MUI 9 antes de implementar (el nombre exacto de la
  opción puede variar).
- **Integración con Next.** Falta el paquete `@mui/material-nextjs` (`AppRouterCacheProvider`),
  que **no se instaló** porque no estaba en la lista. Es necesario para SSR correcto; instalarlo
  al empezar el rediseño.
- **Tema MUI.** Un solo `ThemeProvider` en un componente cliente, con los colores y la tipografía
  del diseño, para no mantener dos paletas.

## Riesgos conocidos

- **Rendimiento.** MUI + Emotion añaden JavaScript de cliente y obligan a `"use client"` en los
  componentes que los usan. La app ya tuvo problemas de lentitud (S04): medir antes y después
  con `pnpm build && pnpm start`, y no mover pantallas enteras a cliente.
- **Dos sistemas de diseño.** Mezclar shadcn y MUI en la misma pantalla se nota. Definir por
  pantalla cuál se usa.
- **Accesibilidad.** Las reglas recomendadas de `jsx-a11y` están activas en `eslint.config.mjs`
  (se aplican a `*.jsx` y `*.tsx`).

## Skill de diseño

La skill `frontend-design` **no está disponible** en esta máquina. Se usan `gentle-design` y
`gentle-ui-design`.
