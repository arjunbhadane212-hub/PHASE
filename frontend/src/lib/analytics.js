import posthog from 'posthog-js';

// PostHog wiring for A/B tests. Everything here is a safe no-op when
// REACT_APP_POSTHOG_KEY is not set, so the app keeps working (and every user
// sees the control experience) until the key is added in Vercel.

const KEY = process.env.REACT_APP_POSTHOG_KEY;
const HOST = process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';

// How long we wait for PostHog to return flags before falling back to control.
const FLAG_TIMEOUT_MS = 1500;

let started = false;

export function initAnalytics() {
  if (!KEY || started) return;
  started = true;
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: 'identified_only',
    autocapture: false, // we only send the explicit events below
    capture_pageview: true,
  });
}

export function identifyUser(userId) {
  if (!KEY || !userId) return;
  posthog.identify(userId);
}

export function track(event, props = {}) {
  if (!KEY) return;
  posthog.capture(event, props);
}

// Resolves to the variant string for a multivariate flag ('control' on any
// failure, timeout, or when PostHog is not configured).
export function getVariant(flagKey) {
  if (!KEY) return Promise.resolve('control');
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(typeof value === 'string' ? value : 'control');
    };
    const timer = setTimeout(() => finish('control'), FLAG_TIMEOUT_MS);
    posthog.onFeatureFlags(() => finish(posthog.getFeatureFlag(flagKey)));
  });
}
