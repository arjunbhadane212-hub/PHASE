import {
  isCapacitorNative,
  isStandaloneDisplay,
  isForceAppActive,
  isInstalledApp,
} from './platform';

// Save/restore the bits of the environment each test pokes at, so cases stay
// independent. NODE_ENV is "test" under craco/jest, so isDebugEnvironment() is
// true and the forceApp override is honoured here.
const realMatchMedia = window.matchMedia;

afterEach(() => {
  delete window.Capacitor;
  window.matchMedia = realMatchMedia;
  try { delete window.navigator.standalone; } catch { /* ignore */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }
  window.history.replaceState({}, '', '/');
});

describe('isCapacitorNative', () => {
  test('false with no Capacitor global', () => {
    expect(isCapacitorNative()).toBe(false);
  });

  test('true via isNativePlatform() (v3+)', () => {
    window.Capacitor = { isNativePlatform: () => true };
    expect(isCapacitorNative()).toBe(true);
  });

  test('false when isNativePlatform() returns false (web build)', () => {
    window.Capacitor = { isNativePlatform: () => false };
    expect(isCapacitorNative()).toBe(false);
  });

  test('true via legacy isNative boolean', () => {
    window.Capacitor = { isNative: true };
    expect(isCapacitorNative()).toBe(true);
  });
});

describe('isStandaloneDisplay', () => {
  test('false by default (normal browser tab)', () => {
    window.matchMedia = () => ({ matches: false });
    expect(isStandaloneDisplay()).toBe(false);
  });

  test('true when display-mode: standalone matches', () => {
    window.matchMedia = (q) => ({ matches: q === '(display-mode: standalone)' });
    expect(isStandaloneDisplay()).toBe(true);
  });

  test('true via iOS navigator.standalone', () => {
    window.matchMedia = () => ({ matches: false });
    Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true });
    expect(isStandaloneDisplay()).toBe(true);
  });
});

describe('isForceAppActive (debug override)', () => {
  test('false with no query param', () => {
    expect(isForceAppActive()).toBe(false);
  });

  test('?forceApp=1 activates and sticks for the session', () => {
    window.history.replaceState({}, '', '/?forceApp=1');
    expect(isForceAppActive()).toBe(true);
    // Sticky: still active after navigating away from the query string.
    window.history.replaceState({}, '', '/dashboard');
    expect(isForceAppActive()).toBe(true);
  });

  test('?forceApp=0 clears a previously sticky override', () => {
    window.history.replaceState({}, '', '/?forceApp=1');
    expect(isForceAppActive()).toBe(true);
    window.history.replaceState({}, '', '/?forceApp=0');
    expect(isForceAppActive()).toBe(false);
  });
});

describe('isInstalledApp', () => {
  test('false in a plain browser tab', () => {
    window.matchMedia = () => ({ matches: false });
    expect(isInstalledApp()).toBe(false);
  });

  test('true when standalone', () => {
    window.matchMedia = (q) => ({ matches: q === '(display-mode: standalone)' });
    expect(isInstalledApp()).toBe(true);
  });

  test('true when forced via ?forceApp=1', () => {
    window.matchMedia = () => ({ matches: false });
    window.history.replaceState({}, '', '/?forceApp=1');
    expect(isInstalledApp()).toBe(true);
  });
});
