// push-dispatch — sends Phase's phone notifications.
//
// Two ways in:
//  1. pg_cron (every 15 min) POSTs with header `x-dispatch-secret`. We ask the
//     DB who is due (push_collect_due — timing, caps, copy and dedupe all live
//     in SQL), encrypt + send each push, then report delivery back so dead
//     devices are pruned (push_report).
//  2. A signed-in user taps "Send test notification" in Settings: we verify
//     their JWT and push one test message to their own devices only
//     (rate-limited to one per 60s).
//
// verify_jwt is OFF for this function because path 1 has no user JWT; each
// path authenticates itself (shared secret from Vault, or auth.getUser).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendWebPush, type VapidKeys } from './webpush.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

type Due = {
  log_id: number; sub_id: string; endpoint: string; p256dh: string; auth: string;
  kind: string; title: string; body: string; url: string; tag: string;
};

async function sendAll(items: Due[], vapid: VapidKeys) {
  const results: { sub_id: string; log_id: number; status: number }[] = [];
  const queue = [...items];
  const worker = async () => {
    while (queue.length) {
      const it = queue.shift()!;
      let status = 0;
      try {
        const res = await sendWebPush(
          { endpoint: it.endpoint, p256dh: it.p256dh, auth: it.auth },
          { title: it.title, body: it.body, url: it.url, tag: it.tag },
          vapid,
          { urgency: it.kind === 'streak_risk' ? 'high' : 'normal', topic: it.tag, ttl: it.kind === 'streak_risk' ? 3 * 3600 : 6 * 3600 },
        );
        status = res.status;
        if (status >= 300) console.warn('push rejected', status, res.body);
      } catch (e) {
        console.error('push error', String(e));
      }
      results.push({ sub_id: it.sub_id, log_id: it.log_id, status });
    }
  };
  await Promise.all(Array.from({ length: Math.min(25, items.length) }, worker));
  return results;
}

async function dispatch(vapid: VapidKeys) {
  const started = Date.now();
  let sent = 0, batches = 0;
  while (Date.now() - started < 45_000 && batches < 20) {
    batches++;
    const { data, error } = await admin.rpc('push_collect_due', { p_limit: 300 });
    if (error) return json({ error: error.message }, 500);
    const items = (data || []) as Due[];
    if (!items.length) break;
    const results = await sendAll(items, vapid);
    await admin.rpc('push_report', { p_results: results });
    sent += results.filter((r) => r.status >= 200 && r.status < 300).length;
  }
  return json({ ok: true, sent, batches });
}

async function sendTest(userId: string, vapid: VapidKeys) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin.from('push_log').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('kind', 'test').gte('sent_at', since);
  if ((count ?? 0) > 0) return json({ error: 'Wait a minute before sending another test.' }, 429);

  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId);
  if (!subs?.length) return json({ error: 'This device is not subscribed yet.' }, 404);

  const { data: copy } = await admin.from('push_copy').select('key, title, body').eq('kind', 'test').eq('active', true).limit(1).maybeSingle();
  const { data: log } = await admin.from('push_log')
    .insert({ user_id: userId, kind: 'test', copy_key: copy?.key ?? null, local_date: new Date().toISOString().slice(0, 10) })
    .select('id').single();

  const items: Due[] = subs.map((s) => ({
    log_id: log?.id ?? 0, sub_id: s.id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth, kind: 'test',
    title: copy?.title ?? 'Notifications are on', body: copy?.body ?? 'Phase can reach you here.',
    url: '/dashboard', tag: 'phase-test',
  }));
  const results = await sendAll(items, vapid);
  await admin.rpc('push_report', { p_results: results });
  const ok = results.filter((r) => r.status >= 200 && r.status < 300).length;
  return json({ ok: ok > 0, devices: subs.length, delivered: ok, statuses: results.map((r) => r.status) }, ok > 0 ? 200 : 502);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const { data: cfg, error } = await admin.rpc('_push_config');
  if (error || !cfg?.vapid_public || !cfg?.vapid_private_jwk) return json({ error: 'push not configured' }, 500);
  const vapid: VapidKeys = { publicKey: cfg.vapid_public, privateJwk: cfg.vapid_private_jwk, subject: cfg.subject };

  const secret = req.headers.get('x-dispatch-secret') ?? '';
  if (secret) {
    if (!safeEqual(secret, cfg.dispatch_secret ?? '')) return json({ error: 'forbidden' }, 403);
    return await dispatch(vapid);
  }

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'unauthorized' }, 401);
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return json({ error: 'unauthorized' }, 401);
  return await sendTest(u.user.id, vapid);
});
