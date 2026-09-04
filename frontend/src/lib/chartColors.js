// Reads the live --gm-* design tokens off <html> so the Recharts *frame*
// (axes, grid, tooltip surface) flips with the app theme (.light-mode toggle).
// Data-mark colors are NOT here — they come from the fixed metric identity
// palette in ProgressPage (cyan/lime/purple, constant in both themes, matching Home).
export function themedChartColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name) => cs.getPropertyValue(name).trim();
  return {
    ink:   v('--gm-ink')   || '#0F1210',
    muted: v('--gm-muted') || '#6C6F6C',
    track: v('--gm-track') || '#D9DBD6',
    card:  v('--gm-card')  || '#F2F3F0',
    bg:    v('--gm-bg')    || '#FAFAF7',
  };
}
