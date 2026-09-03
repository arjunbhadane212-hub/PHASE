// Reads the live --gm-* design tokens off <html> so Recharts marks + frame flip
// with the app theme (.light-mode toggle). Fallbacks are the v2 light values so a
// paint before the tokens resolve still looks sane.
export function themedChartColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name) => cs.getPropertyValue(name).trim();
  return {
    ink:   v('--gm-ink')   || '#0F1210',
    muted: v('--gm-muted') || '#6C6F6C',
    track: v('--gm-track') || '#D9DBD6',
    card:  v('--gm-card')  || '#F2F3F0',
    bg:    v('--gm-bg')    || '#FAFAF7',
    // Progress-only palette: blue is allowed here per v2 "progress indicators only".
    // Five steps of the same blue so multi-series/pies read as monochrome-blue-progress.
    series: ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'],
  };
}
