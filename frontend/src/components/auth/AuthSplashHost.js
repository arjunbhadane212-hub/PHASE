import { useEffect, useState, lazy, Suspense } from 'react';

// The animated layer (framer-motion) is its own chunk so it never weighs on
// first load — it's fetched the moment a sign-in actually succeeds.
const SplashLayer = lazy(() => import('./SuccessSplash').then((m) => ({ default: m.SplashLayer })));

// UI v3: the success screen lives at the app root so it survives the route
// change underneath it. Login/Signup call showAuthSplash(...) and navigate
// immediately; the destination loads behind the splash, which then fades away.
let listener = null;
export function showAuthSplash(opts) { listener?.(opts); }

export default function AuthSplashHost() {
  const [opts, setOpts] = useState(null);
  useEffect(() => {
    listener = setOpts;
    // Returning from Google sign-in (OAuth redirect) gets the same moment.
    const q = new URLSearchParams(window.location.search);
    if (window.location.hash.includes('access_token') || (q.has('code') && window.location.pathname.startsWith('/dashboard'))) {
      setOpts({ title: "You're in", subtitle: 'Signed in with Google.' });
    }
    return () => { listener = null; };
  }, []);
  if (!opts) return null;
  return (
    <Suspense fallback={null}>
      <SplashLayer opts={opts} onDone={() => setOpts(null)} />
    </Suspense>
  );
}
