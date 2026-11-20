// Turns raw Supabase / network errors into messages a person can act on.
// Returns { title, detail, field } — `field` says which input to highlight
// ('email' | 'password' | 'both' | null).
//
// Note on "wrong email vs wrong password": Supabase answers both with the same
// "Invalid login credentials" on purpose (so nobody can probe which emails
// have accounts). We say so plainly and point to the two fixes instead of
// guessing — guessing wrong would send people down the wrong path.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidEmail = (v) => EMAIL_RE.test(String(v || '').trim());

// Client-side checks that run before we call the server, so the most common
// mistakes get a specific message instantly.
export function checkEmail(v) {
  const s = String(v || '').trim();
  if (!s) return 'Enter your email.';
  if (!s.includes('@')) return 'This email is missing an @.';
  if (!isValidEmail(s)) return 'This email doesn’t look right — check for typos, like a missing .com.';
  return '';
}

export function checkPassword(v) {
  if (!v) return 'Enter your password.';
  return '';
}

export function friendlyAuthError(err, ctx = 'login') {
  const m = String(err?.message || err || '');

  if (/invalid login credentials|invalid credentials|invalid grant/i.test(m)) {
    return {
      title: 'Wrong email or password',
      detail: 'One of them doesn’t match an account. Check both for typos — or tap “Forgot?” to reset your password.',
      field: 'both',
    };
  }
  if (/email not confirmed/i.test(m)) {
    return { title: 'Confirm your email first', detail: 'Open the link we emailed you, then log in again.', field: 'email' };
  }
  if (/already registered|already been registered|already exists|user_already_exists/i.test(m)) {
    return { title: 'This email already has an account', detail: 'Log in instead, or sign up with a different email.', field: 'email' };
  }
  if (/password should be at least|weak password|weak_password|password is too short|password.*(characters|length)/i.test(m)) {
    return { title: 'Password is too weak', detail: 'Use at least 8 characters with letters and a number.', field: 'password' };
  }
  if (/same.*password|should be different|new password should/i.test(m)) {
    return { title: 'Pick a different password', detail: 'Your new password can’t be the same as the old one.', field: 'password' };
  }
  if (/unable to validate email|invalid email|email address.*invalid|invalid format/i.test(m)) {
    return { title: 'That email doesn’t look right', detail: 'Check for typos, like a missing @ or .com.', field: 'email' };
  }
  if (/expired|invalid.*(token|link|otp)|auth session missing|session.*not found/i.test(m)) {
    return { title: ctx === 'reset' ? 'This reset link has expired' : 'Your session expired', detail: ctx === 'reset' ? 'Ask for a new link from “Forgot password”.' : 'Log in again to continue.', field: null };
  }
  if (/rate limit|too many|over_request_rate_limit|429/i.test(m)) {
    return { title: 'Too many tries', detail: 'Wait a minute, then try again.', field: null };
  }
  if (/failed to fetch|network|load failed|networkerror|timeout/i.test(m)) {
    return { title: 'Can’t reach Phase right now', detail: 'Check your internet connection and try again.', field: null };
  }
  if (/signups not allowed|signup.*disabled/i.test(m)) {
    return { title: 'Sign-ups are paused', detail: 'Please try again a little later.', field: null };
  }
  if (/google sign-in/i.test(m)) {
    return { title: 'Google sign-in isn’t ready yet', detail: 'Use email for now — you can link Google later with the same email.', field: null };
  }
  const fallback = { login: 'Couldn’t log you in', signup: 'Couldn’t create your account', forgot: 'Couldn’t send the email', reset: 'Couldn’t update your password' }[ctx] || 'Something went wrong';
  return { title: fallback, detail: m && m.length < 140 ? m : 'Please try again in a moment.', field: null };
}
