/**
 * Única fuente de verdad de la dirección A · Mostrador.
 * `app/globals.css` y el tema de MUI leen estos mismos valores; la prueba
 * `e2e/tokens-contract.spec.ts` comprueba que no divergen.
 */
export const cssColorVariables = {
  "--color-canvas": "#FFFFFF",
  "--color-card": "#FFFFFF",
  "--color-surface": "#F7F4F1",
  "--color-surface-2": "#EFE9E3",
  "--color-text": "#222222",
  "--color-text-2": "#6A6560",
  "--color-accent": "#C8274A",
  "--color-accent-hover": "#B01F3F",
  "--color-soft": "#FCE8EC",
  "--color-hero": "#FFE0E5",
  "--color-status-none-fg": "#5F5A55",
  "--color-status-none-bg": "#EFEBE7",
  "--color-status-pending-fg": "#8A5A00",
  "--color-status-pending-bg": "#FFF3D6",
  "--color-status-progress-fg": "#0B4FB3",
  "--color-status-progress-bg": "#E3EEFF",
  "--color-status-done-fg": "#1B6B3A",
  "--color-status-done-bg": "#E1F4E8",
  "--color-status-cancelled-fg": "#A3162F",
  "--color-status-cancelled-bg": "#FDE3E7",
};
