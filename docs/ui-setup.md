# UI · Preparación para el rediseño (Tailwind + shadcn/ui + MUI)

Estado: **fundación técnica aplicada (S08, dirección A · Mostrador)**. Las pantallas de
contenido no se rediseñan en esta entrega: solo heredan shell, tokens y fuentes.

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
  La opción `enableCssLayer` existe en MUI 9.6 (verificada en los tipos de `@mui/material` y
  `@mui/material-nextjs`); falta probarla en pantalla al implementar.
- **Integración con Next.** `@mui/material-nextjs` (`AppRouterCacheProvider`) ya está instalado y
  es necesario para SSR correcto con App Router.
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

La skill `frontend-design` (anthropics/skills) se instaló de forma global en
`~/.agents/skills/frontend-design`. Se usa junto con `gentle-design` y `gentle-ui-design`.

## Dirección visual (P1)

Estado: **propuesta de diseño, sin código de app**. El humano elige una dirección; hasta entonces ningún valor de abajo es token del proyecto (los tokens reales siguen siendo los de `design/system.md`, el tema neutro de shadcn/ui). Artboards en `design/ui-redesign/` (archivos `NN-a-*` y `NN-b-*`, manifiesto `design.json`). Cada dirección trae una pantalla de paleta con los contrastes calculados.

Base común (D5, D7): acento coral oscuro `#C8274A` (5,46:1 con blanco; `#FF385C` 3,52:1, solo decorativo, nunca texto ni botón con texto blanco); cinco estados con icono + texto + color; radios 16–24 px, píldoras en chips y botones, sombras suaves, áreas táctiles ≥44 px, sin bloques negros ni líneas duras (la separación es tonal o con sombra).

### Estados: iconografía

Iconos SVG en línea (trazo 2, 24×24, esquinas redondeadas) con forma propia por estado para no depender solo del color. Los nombres siguen la convención de lucide (la librería de iconos de `components.json`); la columna MUI es el equivalente aproximado de `@mui/icons-material` (existen en el paquete instalado; no se comparó visualmente).

| Estado     | Icono SVG       | Texto / fondo         | MUI equivalente                        |
| ---------- | --------------- | --------------------- | -------------------------------------- |
| Sin estado | `circle-dashed` | `#5F5A55` / `#EFEBE7` | `RadioButtonUncheckedRounded (aprox.)` |
| Pendiente  | `clock`         | `#8A5A00` / `#FFF3D6` | `AccessTimeRounded`                    |
| En proceso | `refresh-cw`    | `#0B4FB3` / `#E3EEFF` | `AutorenewRounded`                     |
| Completado | `circle-check`  | `#1B6B3A` / `#E1F4E8` | `CheckCircleRounded`                   |
| Cancelado  | `circle-x`      | `#A3162F` / `#FDE3E7` | `CancelRounded`                        |

### Dirección A · Mostrador

**Tradeoff:** Lienzo blanco y paneles tonales planos, barra lateral clásica y bandeja de tres paneles muy familiar; la audacia vive solo en el titular de bienvenida (login/inicio). Máxima legibilidad para uso todo el día; menos 'tarjetas flotantes' que Airbnb.

#### Fuentes (next/font/google)

| Familia             | Import                                               | Pesos                     | Rol                                                 |
| ------------------- | ---------------------------------------------------- | ------------------------- | --------------------------------------------------- |
| Bricolage Grotesque | `Bricolage_Grotesque` (`variable: "--font-display"`) | variable (usar 600 y 700) | Títulos y titular de bienvenida; cifras de métricas |
| Figtree             | `Figtree` (`variable: "--font-body"`)                | 400, 500, 600             | Texto de interfaz, mensajes, chips y botones        |

Verificado en `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json` (existen con esos pesos). Los artboards usan solo pila del sistema; la familia real se ve al implementar. Cargar con `display: "swap"` y `subsets: ["latin"]`.

#### Paleta

| Token    | Valor     | Uso                                          |
| -------- | --------- | -------------------------------------------- |
| canvas   | `#FFFFFF` | Fondo                                        |
| card     | `#FFFFFF` | Tarjeta                                      |
| surface  | `#F7F4F1` | Superficie cálida                            |
| surface2 | `#EFE9E3` | Superficie (hover/seleccionado)              |
| text     | `#222222` | Texto                                        |
| text2    | `#6A6560` | Texto secundario                             |
| accent   | `#C8274A` | Acento coral oscuro                          |
| soft     | `#FCE8EC` | Acento suave (burbuja IA, fila seleccionada) |
| hero     | `#FFE0E5` | Fondo del titular                            |
| accentH  | `#B01F3F` | Acento al pasar el cursor (botones)          |

#### Contraste (calculado con script, WCAG 2.x)

| Par                                                     | Texto / fondo         | Razón   | Resultado              |
| ------------------------------------------------------- | --------------------- | ------- | ---------------------- |
| Texto sobre fondo                                       | `#222222` / `#FFFFFF` | 15,91:1 | cumple ≥4,5:1          |
| Texto secundario sobre fondo                            | `#6A6560` / `#FFFFFF` | 5,76:1  | cumple ≥4,5:1          |
| Texto sobre superficie cálida                           | `#222222` / `#F7F4F1` | 14,52:1 | cumple ≥4,5:1          |
| Texto secundario sobre superficie cálida                | `#6A6560` / `#F7F4F1` | 5,26:1  | cumple ≥4,5:1          |
| Texto sobre superficie hover                            | `#222222` / `#EFE9E3` | 13,21:1 | cumple ≥4,5:1          |
| Texto secundario sobre superficie hover                 | `#6A6560` / `#EFE9E3` | 4,79:1  | cumple ≥4,5:1          |
| Blanco sobre acento (botón)                             | `#FFFFFF` / `#C8274A` | 5,46:1  | cumple ≥4,5:1          |
| Blanco sobre acento hover                               | `#FFFFFF` / `#B01F3F` | 6,74:1  | cumple ≥4,5:1          |
| Acento sobre fondo (enlace)                             | `#C8274A` / `#FFFFFF` | 5,46:1  | cumple ≥4,5:1          |
| Acento sobre superficie cálida                          | `#C8274A` / `#F7F4F1` | 4,98:1  | cumple ≥4,5:1          |
| Texto sobre acento suave                                | `#222222` / `#FCE8EC` | 13,56:1 | cumple ≥4,5:1          |
| Texto secundario sobre acento suave                     | `#6A6560` / `#FCE8EC` | 4,91:1  | cumple ≥4,5:1          |
| Acento sobre acento suave                               | `#C8274A` / `#FCE8EC` | 4,65:1  | cumple ≥4,5:1          |
| Error de campo (#A3162F) sobre superficie               | `#A3162F` / `#F7F4F1` | 7,06:1  | cumple ≥4,5:1          |
| Texto sobre fondo del titular                           | `#222222` / `#FFE0E5` | 12,91:1 | cumple ≥4,5:1          |
| Texto secundario sobre fondo del titular                | `#6A6560` / `#FFE0E5` | 4,68:1  | cumple ≥4,5:1          |
| Chip Sin estado                                         | `#5F5A55` / `#EFEBE7` | 5,75:1  | cumple ≥4,5:1          |
| Chip Pendiente                                          | `#8A5A00` / `#FFF3D6` | 5,37:1  | cumple ≥4,5:1          |
| Chip En proceso                                         | `#0B4FB3` / `#E3EEFF` | 6,44:1  | cumple ≥4,5:1          |
| Chip Completado                                         | `#1B6B3A` / `#E1F4E8` | 5,70:1  | cumple ≥4,5:1          |
| Chip Cancelado                                          | `#A3162F` / `#FDE3E7` | 6,38:1  | cumple ≥4,5:1          |
| Anillo de foco (acento) sobre fondo, no texto ≥3:1      | `#C8274A` / `#FFFFFF` | 5,46:1  | cumple ≥3:1 (no texto) |
| Anillo de foco (acento) sobre superficie, no texto ≥3:1 | `#C8274A` / `#F7F4F1` | 4,98:1  | cumple ≥3:1 (no texto) |
| Decorativo #FF385C sobre blanco (solo adorno, NO texto) | `#FF385C` / `#FFFFFF` | 3,52:1  | solo decorativo        |

### Dirección B · Turno

**Tradeoff:** Lienzo arena con tarjetas blancas flotantes (radio 24, sombra suave), navegación superior en píldoras y 'Cómo terminó' como banner de resultado en cada conversación (la única audacia). Más cercana a Airbnb y más pensada para decidir qué atender; ocupa más espacio vertical y más marcos que A.

#### Fuentes (next/font/google)

| Familia                    | Import                                                   | Pesos                                    | Rol                                                                                                              |
| -------------------------- | -------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Atkinson Hyperlegible Next | `Atkinson_Hyperlegible_Next` (`variable: "--font-sans"`) | 400, 500, 600, 700 (variable disponible) | Única familia: títulos, interfaz y mensajes (diseñada para distinguir caracteres, útil en pantallas todo el día) |

Verificado en `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json` (existen con esos pesos). Los artboards usan solo pila del sistema; la familia real se ve al implementar. Cargar con `display: "swap"` y `subsets: ["latin"]`.

#### Paleta

| Token    | Valor     | Uso                                          |
| -------- | --------- | -------------------------------------------- |
| canvas   | `#F5F2EE` | Lienzo arena                                 |
| card     | `#FFFFFF` | Tarjeta                                      |
| surface  | `#ECE7E2` | Arena (burbuja del cliente, campos)          |
| surface2 | `#E4DED8` | Arena hover                                  |
| text     | `#222222` | Texto                                        |
| text2    | `#655F59` | Texto secundario                             |
| accent   | `#C8274A` | Acento coral oscuro                          |
| soft     | `#FDEBEE` | Acento suave (burbuja IA, fila seleccionada) |
| accentH  | `#B01F3F` | Acento al pasar el cursor (botones)          |

#### Contraste (calculado con script, WCAG 2.x)

| Par                                                     | Texto / fondo         | Razón   | Resultado              |
| ------------------------------------------------------- | --------------------- | ------- | ---------------------- |
| Texto sobre lienzo                                      | `#222222` / `#F5F2EE` | 14,26:1 | cumple ≥4,5:1          |
| Texto secundario sobre lienzo                           | `#655F59` / `#F5F2EE` | 5,64:1  | cumple ≥4,5:1          |
| Texto sobre tarjeta                                     | `#222222` / `#FFFFFF` | 15,91:1 | cumple ≥4,5:1          |
| Texto secundario sobre tarjeta                          | `#655F59` / `#FFFFFF` | 6,30:1  | cumple ≥4,5:1          |
| Texto sobre arena                                       | `#222222` / `#ECE7E2` | 12,95:1 | cumple ≥4,5:1          |
| Texto secundario sobre arena                            | `#655F59` / `#ECE7E2` | 5,13:1  | cumple ≥4,5:1          |
| Texto sobre arena hover                                 | `#222222` / `#E4DED8` | 11,92:1 | cumple ≥4,5:1          |
| Texto secundario sobre arena hover                      | `#655F59` / `#E4DED8` | 4,72:1  | cumple ≥4,5:1          |
| Blanco sobre acento (botón)                             | `#FFFFFF` / `#C8274A` | 5,46:1  | cumple ≥4,5:1          |
| Blanco sobre acento hover                               | `#FFFFFF` / `#B01F3F` | 6,74:1  | cumple ≥4,5:1          |
| Acento sobre tarjeta (enlace)                           | `#C8274A` / `#FFFFFF` | 5,46:1  | cumple ≥4,5:1          |
| Acento sobre lienzo                                     | `#C8274A` / `#F5F2EE` | 4,89:1  | cumple ≥4,5:1          |
| Texto sobre acento suave                                | `#222222` / `#FDEBEE` | 13,86:1 | cumple ≥4,5:1          |
| Texto secundario sobre acento suave                     | `#655F59` / `#FDEBEE` | 5,49:1  | cumple ≥4,5:1          |
| Acento sobre acento suave                               | `#C8274A` / `#FDEBEE` | 4,76:1  | cumple ≥4,5:1          |
| Error de campo (#A3162F) sobre arena                    | `#A3162F` / `#ECE7E2` | 6,30:1  | cumple ≥4,5:1          |
| Chip Sin estado                                         | `#5F5A55` / `#EFEBE7` | 5,75:1  | cumple ≥4,5:1          |
| Chip Pendiente                                          | `#8A5A00` / `#FFF3D6` | 5,37:1  | cumple ≥4,5:1          |
| Chip En proceso                                         | `#0B4FB3` / `#E3EEFF` | 6,44:1  | cumple ≥4,5:1          |
| Chip Completado                                         | `#1B6B3A` / `#E1F4E8` | 5,70:1  | cumple ≥4,5:1          |
| Chip Cancelado                                          | `#A3162F` / `#FDE3E7` | 6,38:1  | cumple ≥4,5:1          |
| Anillo de foco (acento) sobre fondo, no texto ≥3:1      | `#C8274A` / `#F5F2EE` | 4,89:1  | cumple ≥3:1 (no texto) |
| Anillo de foco (acento) sobre superficie, no texto ≥3:1 | `#C8274A` / `#ECE7E2` | 4,45:1  | cumple ≥3:1 (no texto) |
| Decorativo #FF385C sobre blanco (solo adorno, NO texto) | `#FF385C` / `#FFFFFF` | 3,52:1  | solo decorativo        |

### Notas para P2

- `app/layout.tsx` hoy carga Geist y `globals.css` fuerza Arial en `body`; al elegir dirección se reemplaza por las familias de arriba.
- Mascota/identidad (P3): A usa una burbuja de chat con carita sobre cuadrado redondeado coral; B usa un círculo coral con barras de onda de voz. Ambas son SVG propios y provisionales.
- Los artboards no incluyen modo oscuro.

### Pantallas añadidas a la dirección visual (Contactos, Negocio, Asistente, Cuenta)

Mismo manifiesto `design/ui-redesign/design.json`: archivos `17`–`24` (dirección A) y `25`–`32` (dirección B), cada pantalla a 1440 y a 390, con los estados normal, cargando, error (y vacío en Contactos) visibles desde el selector "Ver estado" del propio artboard. Los textos y datos son de ejemplo. La regla de contraseña nueva de `/account` es la de `strongPasswordSchema` (mínimo 12 caracteres, mayúscula, minúscula, número y símbolo); la de login sigue siendo solo "no vacía".

Pares de contraste agregados a las paletas (`01-a-paleta.html`, `09-b-paleta.html`), todos ≥4,5:1 en texto: requisito cumplido `#1B6B3A` sobre tarjeta y superficie, aviso de error `#A3162F` sobre `#FDE3E7`, aviso de éxito `#1B6B3A` sobre `#E1F4E8`. No texto (≥3:1): borde de campo `#857F7A` (3,95:1 sobre blanco; 3,61:1 en A y 3,22:1 en B sobre superficie) e interruptor encendido/apagado sobre tarjeta. En la tarjeta de progreso de A (fondo `--hero`) el porcentaje y "Ir" usan el color de texto, porque el acento sobre `#FFE0E5` da 4,43:1.

## Parte 2 (S08) · Fundación técnica aplicada

Rama `feat/ui-p2-fundacion`, creada desde `feat/ui-p1-direccion`. Sin commit ni push. La
dirección elegida es **A · Mostrador**; las referencias visuales están en `design/ui-redesign/`
(sin trackear, conservadas).

### Decisiones

- **Base de componentes: Tailwind.** MUI queda como tema compartido, sin `CssBaseline`:
  el reset y la tipografía los define `@layer base` de Tailwind en `app/globals.css`. Un
  `CssBaseline` global duplicaría el reset y competiría por el orden de inyección.
- **Una sola fuente de verdad de color:** `components/theme/tokens.ts`. MUI lee ese objeto
  en `components/theme/ThemeRegistry.tsx` y Tailwind lee el bloque `@theme` generado a mano
  en `app/globals.css`. `e2e/tokens-contract.spec.ts` falla si difieren o si aparece un hex
  de seis dígitos fuera de `tokens.ts` y de los bloques `@theme`.
- **Capas CSS:** `@layer theme, base, mui, components, utilities;` al inicio de
  `globals.css`, y `AppRouterCacheProvider options={{ enableCssLayer: true }}` desde
  `@mui/material-nextjs/v16-appRouter`. El nombre de la opción está verificado en
  `node_modules/@mui/material-nextjs/v13-appRouter/appRouterV13.d.ts:12` (el export `v16`
  reexporta ese tipo). La prueba en navegador inyecta `.bg-canvas` en `@layer mui` con otro
  color y comprueba que gana la utilidad de Tailwind (`rgb(255, 255, 255)`).
- **Fuentes:** `Bricolage_Grotesque` (`--font-display`, 600/700) y `Figtree`
  (`--font-body`, 400/500/600), con `display: "swap"` y `subsets: ["latin"]`. No hubo error
  de descarga en el build: Next generó los `.woff2` en `.next/static/media` y el navegador
  resolvió `body` a `Figtree, "Figtree Fallback"`. Se retiró la regla `font-family: Arial`.
- **Shell:** `h-dvh overflow-hidden` en la raíz del dashboard; `main` tiene `min-h-0`,
  `min-w-0` y `overflow-y-auto`. Navegación en barra inferior (<768 px), rail de iconos
  (768–1279 px) y barra lateral con etiquetas (≥1280 px), sin cambiar las seis rutas ni los
  textos de los enlaces. Se eligió barra inferior en móvil (alternativa permitida) en lugar
  del menú flotante del artboard: no añade estado ni JS.
- **Foco y movimiento:** `:focus-visible` con anillo de 2 px de `--color-accent` y offset de
  2 px; `prefers-reduced-motion: reduce` anula animaciones, transiciones y scroll suave.
- **Efecto heredado a reportar:** el alias `--color-accent` de Tailwind ahora apunta al
  acento de la marca (`#C8274A`), así que los componentes existentes que usaban
  `bg-accent` para hover/selección muestran ese color. No se rediseñaron sus estructuras.
  Se retiró el bloque de modo oscuro: la dirección A no lo incluye y sus variables ya no
  alimentan los alias.

### Medición S04 (HTML y JS de cliente, build de producción)

| Ruta     | HTML antes |       HTML después |  JS antes |          JS después | Requests JS |
| -------- | ---------: | -----------------: | --------: | ------------------: | ----------: |
| `/home`  |   28 853 B | 34 852 B (+20,8 %) | 470 316 B | 562 432 B (+19,6 %) |      8 → 10 |
| `/inbox` |  112 091 B | 118 101 B (+5,4 %) | 863 824 B | 955 940 B (+10,7 %) |      9 → 11 |

El incremento de ~92 kB de JS y 2 peticiones es el coste de MUI + Emotion en el provider
raíz. Es un riesgo de rendimiento conocido: conviene vigilarlo antes de mover pantallas
completas a MUI. La medición se hizo contra Supabase local; la ejecución final del build
usó los valores dummy del handoff.

### Verificación

- `pnpm lint` → exit 0. `pnpm typecheck` → exit 0. `pnpm arch` → exit 0 (174 módulos).
- `pnpm test` → exit 0. `pnpm db:test` → exit 0 (5 archivos, 65 pruebas).
- `pnpm test:e2e` con servidor de producción → exit 0: 30 passed, 5 skipped.
- Pruebas nuevas: rojo antes del cambio (7 fallos: 6 de scroll de página a 360 px y el
  contrato de tokens) y verde después (11 passed, dos ejecuciones consecutivas).
- Build dummy del handoff → exit 0. Build con Supabase local → exit 0, sin error de fuentes.

Nota: los esqueletos de carga existentes ponen `aria-label` en un `div` sin rol, lo que axe
marca como `aria-prohibited-attr` si se analiza durante el Suspense. La prueba de axe espera
a que no quede ningún `[aria-busy="true"]`; arreglar el esqueleto queda fuera de esta
fundación (no es una pantalla de esta entrega).

## Parte 3 (S10) · Login y Home

Rama `feat/ui-p3-login-home`, creada desde `feat/ui-p2-fundacion` (683a5a7). Sin commit ni push.

### Decisiones

- **Login con validación propia:** el `<form>` usa `noValidate` para sustituir los mensajes
  nativos del navegador por los mensajes zod en español. `credentialsSchema` sigue siendo la
  única fuente de reglas; `loginFieldErrors` solo traduce los issues a errores por campo. En
  login la contraseña sigue siendo solo "no vacía"; la fuerza se exige en alta/cambio.
- **Errores sin filtrar información:** las credenciales incorrectas devuelven siempre
  `Email o contraseña incorrectos.`, sin indicar si el correo existe. Los errores de campo se
  asocian con `aria-describedby` y `aria-invalid`, se anuncian en español y llevan el foco al
  primer campo inválido.
- **Login como Server Component:** solo `login-form.tsx` es cliente; el hero con `--color-hero`
  y el titular con `--font-display` se renderizan en servidor. El control de mostrar/ocultar
  contraseña es un `<button>` nativo con nombre y estado accesibles, sin librería de iconos.
- **Tarjeta de WhatsApp:** el título es "WhatsApp del negocio" (no "Conectar WhatsApp") para
  que no contradiga el badge "Conectado". El badge combina icono, texto y color del token de
  estado. Con `showForm === false` se omiten el formulario y los pasos de Meta (incluida la
  suscripción a `messages`); la URL del webhook y su botón de copiar siguen disponibles. El token
  de verificación nunca se muestra ni se copia: solo se informa si está configurado. Si no hay
  `NEXT_PUBLIC_APP_URL`, se muestra la ruta relativa con una nota.
- **Saludo de home fiel al estado:** el encabezado cambia su texto según la conexión ("Tu
  WhatsApp ya está contestando…" cuando `tone === "ok"`, si no la invitación a conectar). El
  artboard personaliza con nombre y negocio; aquí se omite porque `/home` no recibe esos datos y
  el handoff prohíbe tocar auth.
- **Campos del login normalizados a texto:** la server action convierte a `""` cualquier valor
  que no sea string antes de validar, para que un campo ausente no devuelva un mensaje de zod en
  inglés ni llegue a `parse`.
- **Métricas sin inventar datos:** la franja es un placeholder de la Parte 5 con `—` y
  "Disponible pronto"; no se muestran cifras ni se consultan tablas nuevas.
- **Esqueletos accesibles:** `CardSkeleton` y el esqueleto propio de home usan `role="status"`
  con texto `sr-only` y barras `aria-hidden`; se retira el `aria-label` en un `div` sin rol.
- **Sin dependencias nuevas:** MUI sigue limitado al tema global; estas dos pantallas usan
  utilidades de Tailwind y tokens. El incremento de JS se limita al estado local de los dos
  componentes interactivos.

### Medición S10 (HTML y JS de cliente, build de producción)

Mismo método que la fundación: `pnpm build` contra Supabase local, `pnpm exec next start -p 3200`
y navegación real con Playwright; se suma el tamaño de la respuesta HTML y de las respuestas de
script. Los datos de `/home` se miden con la sesión demo del seed local.

| Ruta     | HTML antes | HTML después | Δ HTML              | JS antes  | JS después | Δ JS              | Peticiones JS |
| -------- | ---------- | ------------ | ------------------- | --------- | ---------- | ----------------- | ------------- |
| `/login` | 11 484 B   | 16 825 B     | +5 341 B (+46,5 %)  | 550 936 B | 552 226 B  | +1 290 B (+0,2 %) | 9 → 9         |
| `/home`  | 34 852 B   | 50 812 B     | +15 960 B (+45,8 %) | 562 432 B | 564 699 B  | +2 267 B (+0,4 %) | 10 → 10       |

El HTML crece por el nuevo contenido visible y por el texto accesible de esqueletos y métricas.
El JS sube 1,3 kB en `/login` y 2,3 kB en `/home`, sin añadir peticiones: es el estado local
necesario para mostrar contraseña, foco/errores y copiar la URL. La medición "antes" se repitió
con el mismo método sobre `683a5a7` y reprodujo exactamente los valores base ya documentados.

### Verificación S10

- `pnpm lint`: exit 0.
- `pnpm typecheck`: `✓ Types generated successfully`, exit 0.
- `pnpm test`: `Test Files 23 passed (23)`, `Tests 137 passed (137)`, exit 0.
- `pnpm arch`: `✔ no dependency violations found (175 modules, 454 dependencies cruised)`, exit 0.
- `pnpm db:test`: `All tests successful. Files=5, Tests=65`, exit 0.
- `pnpm test:e2e`: `45 passed (4.0m)`, `5 skipped`, exit 0. Incluye axe sin violaciones
  serious/critical en `/login` y `/home`, fuentes display cargadas, sin overflow y copia real
  del webhook.
- Build con las variables dummy del handoff: exit 0 (sirve para medir y para el build).
- **Para E2E hay que construir con las claves locales reales**, no con `dummy`: las variables
  `NEXT_PUBLIC_*` se incrustan en el bundle del cliente y el Realtime de la bandeja falla con
  `MalformedJWT` si el build usó `dummy`. Con el build de claves locales, los 3 tests de
  Realtime pasan.
- No se hicieron commit ni push. No se leyeron ni editaron archivos de entorno.

### S14: pantalla de registro

- `/signup` replica la dirección A de `/login`: hero con `--color-hero`, titular con
  `--font-display` (Bricolage Grotesque) y formulario como único bloque interactivo. La página
  es Server Component; solo `signup-form.tsx` es cliente.
- Tres campos con etiqueta visible, `aria-describedby` y `aria-invalid`: negocio, correo y
  contraseña. El formulario usa `noValidate`; la validación ocurre en el servidor con los
  esquemas ya existentes, y los mensajes llegan en español. El foco vuelve al primer campo
  inválido tras la respuesta.
- El control de mostrar/ocultar contraseña es un `<button>` nativo con nombre accesible,
  `aria-pressed` y `aria-controls`; mide al menos 44 px de alto. La pista de complejidad es
  texto visible asociado al campo.
- El estado de carga se anuncia con `role="status"` y `aria-live="polite"`, y el botón se
  deshabilita mientras envía. Los errores generales no muestran detalles internos.
- Navegación: `/login` enlaza a "Crear cuenta" y `/signup` enlaza a "Ya tengo cuenta". El
  middleware deja `/signup` público y devuelve a `/home` a quien ya tiene sesión.
- **Sin dependencias nuevas.** El incremento de JS se limita al estado local del formulario.

### Medición S14 (HTML y JS de cliente)

Mismo procedimiento que las mediciones anteriores, con builds de webpack sobre `f0ca89d` (antes)
y sobre el árbol con el registro (después), las mismas variables de entorno locales y navegación
real con Playwright sumando el cuerpo de la respuesta HTML y de las respuestas de script.
Se usa webpack en ambos lados para que la comparación sea homogénea; Turbopack no puede compilar
una copia temporal con los enlaces de `node_modules` de pnpm.

| Ruta      | HTML antes | HTML después | Δ HTML          | JS antes  | JS después | Δ JS              | Peticiones JS |
| --------- | ---------- | ------------ | --------------- | --------- | ---------- | ----------------- | ------------- |
| `/login`  | 15 782 B   | 16 334 B     | +552 B (+3,5 %) | 545 730 B | 553 409 B  | +7 679 B (+1,4 %) | 7 → 8         |
| `/signup` | —          | 17 151 B     | ruta nueva      | —         | 554 191 B  | ruta nueva        | 8             |

`/signup` no existía antes: la respuesta base es la página de fallback, no una pantalla comparable.
El HTML de `/login` crece por el enlace "Crear cuenta"; el JS compartido crece porque la nueva
ruta entra en el grafo de chunks, sin añadir dependencias. Medición adicional con Turbopack sobre
el árbol final: `/login` 17 126 B de HTML y 571 562 B de JS (9 peticiones), `/signup` 17 941 B y
571 562 B (9 peticiones). No se compara esa medición con la base porque la base no se pudo
compilar con Turbopack fuera del worktree.

## Parte 5 (S17) · Contactos, Negocio, Asistente y Cuenta

- Se aplica la dirección A sin cambiar actions, esquemas ni validaciones de `modules/business`.
  Los encabezados, secciones y estados usan Bricolage, tokens de `components/theme/tokens.ts`,
  iconos en línea y áreas táctiles de al menos 44 px.
- Contactos conserva la búsqueda local y la paginación por cursor; los estados de carga, error,
  vacío y sin resultados llevan ícono y texto. No se inventó un estado de conversación porque
  `Contact` no expone ese dato.
- Negocio solo cambia la presentación de los cuatro formularios existentes. La tarjeta de
  progreso se deriva de los cuatro datos que la página ya consulta; no consulta tablas nuevas.
- Asistente mantiene el enum `roberto | eduardo` y el idioma `es-MX` del esquema. La vista
  previa muestra únicamente valores reales de la configuración guardada.
- Cuenta muestra solo correo y nombre disponibles en la sesión de Supabase. Las funciones sin
  backend (guardar datos y cambiar contraseña) se marcan "Próximamente" sin formularios ni cifras
  falsas. Cerrar sesión reutiliza el endpoint POST existente.
- `vitest.config.ts` amplía el glob de `pnpm test` a `tests/*.test.ts` para que las pruebas
  nuevas vivan en la superficie permitida `tests`. El glob excluye `tests/integration/**` para
  no mezclar pruebas que requieren entorno de Supabase en la suite unitaria.
- No se ejecutó E2E ni se usó el puerto 3200. Sí se comprobó axe (violaciones `serious` y
  `critical`) y overflow en 390, 1024 y 1440 con un servidor propio en el puerto 3300: 16
  comprobaciones, sin problemas. La verificación funcional quedó en pruebas de helper y de
  componente con Vitest, además de los cuatro comandos del repositorio.
