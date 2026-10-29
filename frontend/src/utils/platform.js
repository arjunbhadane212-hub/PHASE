// Platform detection for the installed-app vs. browser-tab distinction.
//
// The same Vercel build serves both the marketing site (normal browser tab) and
// the installed app (Capacitor native shell, an installed PWA on desktop/mobile,
// or iOS "Add to Home Screen"). The landing page must only ever show in a normal
// browser tab; everything here is what tells those two worlds apart.
//
// Keep each check tiny and side-effect-free (except the sticky debug override)
// so it can run during render and in tests with a mocked `window`.

// Capacitor native shell. Capacitor is NOT a dependency of this repo yet, so
// this is deliberately defensive feature-detection: it stays false in the web
// build and only lights up if/when the app is wrapped with Capacitor, which
// injects `window.Capacitor`. Covers both the v3+ `isNativePlatform()` API and
// the older `isNative` boolean.
export function isCapacitorNative() {
  if (typeof window === 'undefined') return false;
  const cap = window.Capacitor;
  if (!cap) return false;
  try {
    if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
  } catch { /* fall through */ }
  return cap.isNative === true;
}

// Installed/standalone PWA. `display-mode: standalone` covers desktop + Android
// installed PWAs; `navigator.standalone` is the iOS Safari "Add to Home Screen"
// signal (non-standard, iOS only).
export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  const mql = window.matchMedia?.('(display-mode: standalone)');
  if (mql?.matches) return true;
  return window.navigator?.standalone === true;
}

// The debug override is only honoured in dev and on preview deployments, never
// in a real production build on the canonical domain. NODE_ENV catches local
// `craco start`; the hostname check catches Vercel preview URLs (*.vercel.app)
// and localhost, since preview deployments are still production builds.
export function isDebugEnvironment() {
  if (process.env.NODE_ENV !== 'production') return true;
  if (typeof window === 'undefined') return false;
  const host = window.location?.hostname || '';
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app');
}

const FORCE_APP_KEY = 'phase:forceApp';

// Debug override so the installed-app entry flow can be exercised in a normal
// browser tab: append `?forceApp=1`. It sticks for the rest of the session
// (survives client-side navigation) so you aren't forced to keep the query
// string on every route; `?forceApp=0` clears it. Gated to dev/preview only.
export function isForceAppActive() {
  if (typeof window === 'undefined' || !isDebugEnvironment()) return false;
  try {
    const flag = new URLSearchParams(window.location.search).get('forceApp');
    if (flag === '1') {
      try { sessionStorage.setItem(FORCE_APP_KEY, '1'); } catch { /* ignore */ }
      return true;
    }
    if (flag === '0') {
      try { sessionStorage.removeItem(FORCE_APP_KEY); } catch { /* ignore */ }
      return false;
    }
    return sessionStorage.getItem(FORCE_APP_KEY) === '1';
  } catch {
    return false;
  }
}

// The single source of truth every caller should use: true when we're running
// as the installed app (native, standalone, or forced for debugging).
export function isInstalledApp() {
  return isForceAppActive() || isCapacitorNative() || isStandaloneDisplay();
}
