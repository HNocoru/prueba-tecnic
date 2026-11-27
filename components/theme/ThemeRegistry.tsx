"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import type { Shadows } from "@mui/material/styles";
import type { ReactNode } from "react";

import { cssColorVariables as color } from "./tokens";

/** Sombras suaves y planas: la separación es tonal, no una línea dura. */
const shadows = [
  "none",
  "0 1px 2px rgba(34, 34, 34, 0.06)",
  "0 4px 12px rgba(34, 34, 34, 0.08)",
  "0 8px 24px rgba(34, 34, 34, 0.08)",
  "0 12px 36px rgba(34, 34, 34, 0.08)",
  ...Array.from({ length: 20 }, () => "none"),
] as unknown as Shadows;

const displayFont = "var(--font-display), ui-rounded, system-ui, sans-serif";
const bodyFont = "var(--font-body), ui-sans-serif, system-ui, sans-serif";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: color["--color-accent"],
      dark: color["--color-accent-hover"],
      contrastText: color["--color-canvas"],
    },
    background: {
      default: color["--color-canvas"],
      paper: color["--color-card"],
    },
    text: {
      primary: color["--color-text"],
      secondary: color["--color-text-2"],
    },
    success: {
      main: color["--color-status-done-fg"],
      light: color["--color-status-done-bg"],
    },
    warning: {
      main: color["--color-status-pending-fg"],
      light: color["--color-status-pending-bg"],
    },
    info: {
      main: color["--color-status-progress-fg"],
      light: color["--color-status-progress-bg"],
    },
    error: {
      main: color["--color-status-cancelled-fg"],
      light: color["--color-status-cancelled-bg"],
    },
    divider: color["--color-surface-2"],
  },
  typography: {
    fontFamily: bodyFont,
    h1: { fontFamily: displayFont, fontWeight: 700 },
    h2: { fontFamily: displayFont, fontWeight: 700 },
    h3: { fontFamily: displayFont, fontWeight: 600 },
    h4: { fontFamily: displayFont, fontWeight: 600 },
    h5: { fontFamily: displayFont, fontWeight: 600 },
    h6: { fontFamily: displayFont, fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: 16 },
  shadows,
  components: {
    MuiButton: {
      styleOverrides: {
        root: { minHeight: 44, borderRadius: 999, boxShadow: "none" },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999 },
      },
    },
  },
});

/**
 * Proveedor del tema de MUI. Es el único componente cliente de la fundación:
 * el layout raíz y el del dashboard siguen siendo servidor.
 * `enableCssLayer` introduce los estilos de Emotion en `@layer mui`, por debajo
 * de las utilidades de Tailwind.
 */
export function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
