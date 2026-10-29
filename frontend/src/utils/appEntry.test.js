import {
  resolveRootRoute,
  ROUTE_LANDING,
  ROUTE_HOME,
  ROUTE_WELCOME,
  ROUTE_LOGIN,
} from './appEntry';

describe('resolveRootRoute', () => {
  // Signed in always wins, installed or not — never rest on the landing page.
  test('signed in → home (browser tab)', () => {
    expect(resolveRootRoute({ isInstalled: false, isLoggedIn: true, hasSeenIntro: false }))
      .toBe(ROUTE_HOME);
  });

  test('signed in → home (installed app)', () => {
    expect(resolveRootRoute({ isInstalled: true, isLoggedIn: true, hasSeenIntro: true }))
      .toBe(ROUTE_HOME);
  });

  // Signed-out browser tab → marketing landing, regardless of the intro flag.
  test('signed out + browser → landing', () => {
    expect(resolveRootRoute({ isInstalled: false, isLoggedIn: false, hasSeenIntro: false }))
      .toBe(ROUTE_LANDING);
    expect(resolveRootRoute({ isInstalled: false, isLoggedIn: false, hasSeenIntro: true }))
      .toBe(ROUTE_LANDING);
  });

  // Installed + signed out: first launch → intro, later launches → login/signup.
  test('signed out + installed, first launch → welcome', () => {
    expect(resolveRootRoute({ isInstalled: true, isLoggedIn: false, hasSeenIntro: false }))
      .toBe(ROUTE_WELCOME);
  });

  test('signed out + installed, later launch → login', () => {
    expect(resolveRootRoute({ isInstalled: true, isLoggedIn: false, hasSeenIntro: true }))
      .toBe(ROUTE_LOGIN);
  });

  // The landing page is never reachable from inside the installed app.
  test('installed app never resolves to landing', () => {
    for (const isLoggedIn of [true, false]) {
      for (const hasSeenIntro of [true, false]) {
        expect(resolveRootRoute({ isInstalled: true, isLoggedIn, hasSeenIntro }))
          .not.toBe(ROUTE_LANDING);
      }
    }
  });
});
