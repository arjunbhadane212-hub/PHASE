// The entry-point routing decision, as a pure function so it's trivially unit
// testable (no window, no React, no Supabase — callers resolve the booleans and
// pass them in). This is the brain behind the "/" and "/app" routes.
//
// Rules (from the install-vs-browser spec):
//   - Signed in            → straight into the app home. Never rest on the
//                            marketing landing page, installed or not (a Back
//                            press that lands on "/" bounces into the app). The
//                            post-signup survey gate is ProtectedRoute's job, so
//                            we always aim at home and let it redirect if needed.
//   - Signed out + browser → the marketing landing page, as today.
//   - Signed out + installed, first launch → the pre-auth intro.
//   - Signed out + installed, later launches → the login/signup screen.

export const ROUTE_LANDING = 'landing'; // sentinel: render <LandingPage/> in place
export const ROUTE_HOME = '/dashboard';
export const ROUTE_WELCOME = '/welcome';
export const ROUTE_LOGIN = '/login';

export function resolveRootRoute({ isInstalled, isLoggedIn, hasSeenIntro }) {
  if (isLoggedIn) return ROUTE_HOME;
  if (!isInstalled) return ROUTE_LANDING;
  return hasSeenIntro ? ROUTE_LOGIN : ROUTE_WELCOME;
}
