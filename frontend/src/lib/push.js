// Phone / browser push notifications (Web Push).
//
// Works on Android Chrome, desktop Chrome/Edge/Firefox/Safari, and iPhone /
// iPad on iOS 16.4+ ONLY after Phase is added to the Home Screen (Apple's
// rule: web push is for installed web apps). The server side (schedule, copy,
// caps) lives in Supabase: push_collect_due + the push-dispatch function.
import { supabase } from './supabaseClient';

// VAPID public key (safe to ship; the private half lives in Supabase Vault).
export const VAPID_PUBLIC_KEY = 'BEuV8rJG5lHFZ1HnrdxXUB93Hu-1v-1QM4uRWuK4h2dPExVjWzqViudTq2fxbKQ5OmgFqBnAT03cPsgEacxuYl0';

const PRIMER_KEY = 'phase_push_primer_dismissed_at';

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// 'supported' | 'needs-install' (iOS in a browser tab) | 'unsupported'
export function pushSupport() {
  if (typeof window === 'undefined') return 'unsupported';
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (isIOS() && !isStandalone()) return 'needs-install';
  return hasApis ? 'supported' : 'unsupported';
}

export function permission() {
  return typeof Notification === 'undefined' ? 'default' : Notification.permission;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (e) {
    console.warn('service worker registration failed', e);
    return null;
  }
}

async function readySW() {
  await registerServiceWorker();
  return navigator.serviceWorker.ready;
}

export async function currentSubscription() {
  if (pushSupport() !== 'supported') return null;
  const reg = await readySW();
  return reg.pushManager.getSubscription();
}

// Ask (if needed), subscribe this device and store it server-side.
export async function enablePush() {
  const support = pushSupport();
  if (support === 'needs-install') throw new Error('On iPhone, add Phase to your Home Screen first (Share → Add to Home Screen), then turn this on from the app.');
  if (support !== 'supported') throw new Error('This browser can’t receive notifications.');
  let perm = permission();
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications are blocked. Allow them for Phase in your browser or phone settings.');
  const reg = await readySW();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) });
  }
  const json = sub.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint, p_p256dh: json.keys?.p256dh, p_auth: json.keys?.auth, p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
  return true;
}

export async function disablePush() {
  const sub = await currentSubscription().catch(() => null);
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe().catch(() => {});
}

// Keep the stored subscription fresh (browsers rotate endpoints silently).
export async function syncPushSubscription() {
  if (pushSupport() !== 'supported' || permission() !== 'granted') return;
  const sub = await currentSubscription().catch(() => null);
  if (!sub) return;
  const json = sub.toJSON();
  await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint, p_p256dh: json.keys?.p256dh, p_auth: json.keys?.auth, p_user_agent: navigator.userAgent,
  });
}

export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke('push-dispatch', { body: { test: true } });
  if (error) {
    let msg = error.message;
    try { const body = await error.context?.json?.(); if (body?.error) msg = body.error; } catch { /* keep default */ }
    throw new Error(msg || 'Could not send a test notification');
  }
  return data;
}

// The soft "pre-permission" ask (Duolingo pattern): only after a real win,
// never twice within 3 days, never once the browser has an answer.
export function shouldShowPrimer() {
  if (pushSupport() === 'unsupported') return false;
  if (pushSupport() === 'supported' && permission() !== 'default') return false;
  const at = Number(localStorage.getItem(PRIMER_KEY) || 0);
  return Date.now() - at > 3 * 24 * 3600 * 1000;
}

export function dismissPrimer() {
  localStorage.setItem(PRIMER_KEY, String(Date.now()));
}
