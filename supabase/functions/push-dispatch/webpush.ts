// Minimal, dependency-free Web Push sender (RFC 8291 aes128gcm + RFC 8292 VAPID)
// built on WebCrypto, so it runs unchanged in the Supabase Edge Runtime (Deno)
// and in Node 22 (used for the local round-trip test against a reference
// decryptor). No npm web-push: its node:crypto ECDH path is not reliable in Deno.

export type PushSubscriptionKeys = { endpoint: string; p256dh: string; auth: string };
export type VapidKeys = { publicKey: string; privateJwk: JsonWebKey; subject: string };

const enc = new TextEncoder();

export function b64uToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64u(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

// HKDF with a single-block expand (every output here is <= 32 bytes).
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const prk = await hmac(salt, ikm);
  const t = await hmac(prk, concat(info, new Uint8Array([1])));
  return t.slice(0, len);
}

// Encrypt `payload` for one subscription (aes128gcm, single record).
export async function encryptPayload(
  sub: PushSubscriptionKeys,
  payload: Uint8Array,
  salt: Uint8Array = crypto.getRandomValues(new Uint8Array(16)),
): Promise<Uint8Array> {
  const uaPublic = b64uToBytes(sub.p256dh);
  const authSecret = b64uToBytes(sub.auth);
  if (uaPublic.length !== 65 || authSecret.length < 16) throw new Error('bad subscription keys');

  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));

  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  // single record: payload || 0x02 delimiter
  const plain = concat(payload, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plain));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

// VAPID Authorization header value for a push endpoint.
export async function vapidAuthorization(endpoint: string, vapid: VapidKeys, ttlSeconds = 12 * 3600): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = bytesToB64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = bytesToB64u(enc.encode(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + ttlSeconds, sub: vapid.subject,
  })));
  const signingInput = enc.encode(`${header}.${claims}`);
  const key = await crypto.subtle.importKey('jwk', { ...vapid.privateJwk, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  // WebCrypto ECDSA returns IEEE-P1363 (r||s), which is exactly what JWS ES256 wants.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, signingInput));
  return `vapid t=${header}.${claims}.${bytesToB64u(sig)}, k=${vapid.publicKey}`;
}

export async function sendWebPush(
  sub: PushSubscriptionKeys,
  data: unknown,
  vapid: VapidKeys,
  opts: { ttl?: number; urgency?: 'very-low' | 'low' | 'normal' | 'high'; topic?: string } = {},
): Promise<{ status: number; body: string }> {
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(data)));
  const headers: Record<string, string> = {
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(opts.ttl ?? 6 * 3600),
    Urgency: opts.urgency ?? 'normal',
    Authorization: await vapidAuthorization(sub.endpoint, vapid),
  };
  // Topic must be <= 32 url-safe chars; it collapses an older undelivered push.
  if (opts.topic) headers.Topic = opts.topic.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  const res = await fetch(sub.endpoint, { method: 'POST', headers, body });
  let text = '';
  try { text = await res.text(); } catch { /* ignore */ }
  return { status: res.status, body: text.slice(0, 300) };
}
