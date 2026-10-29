// "Has the installed app shown its first-launch intro yet?" — persisted locally
// so first launch sees the intro and every later launch skips straight to the
// login/signup screen. This is the PRE-AUTH install intro, distinct from the
// post-signup survey (`users.onboarding_completed`, server-side) at /onboarding.
//
// localStorage is per-install/per-browser, which is exactly the right scope: the
// intro is about this device's first run, not the user account. Every access is
// wrapped because storage can throw (private mode, blocked cookies).
const KEY = 'phase:hasSeenOnboarding';

export function hasSeenOnboarding() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    // If storage is unreadable, treat it as "seen" so we don't trap the user in
    // the intro on every launch — they can still reach login from the intro.
    return true;
  }
}

export function markOnboardingSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch { /* non-fatal: worst case the intro shows again next launch */ }
}
