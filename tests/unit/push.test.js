import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// push.js is thin glue over browser APIs (Notification, ServiceWorker,
// PushManager) and Supabase. The unit env is plain Node (no DOM), so we stub the
// browser globals per-test with vi.stubGlobal and mock the supabase client and
// the VAPID config module. Mutable state lives in vi.hoisted() so the mock
// factories (hoisted above the imports) can read it.
const cfg = vi.hoisted(() => ({
  // A real base64url VAPID public key so urlBase64ToUint8Array (atob) succeeds.
  key: 'BKdCo3I2-GHe8a4qSlizAgVh3tCGoqRHNIM2IkZmpRbjs74Abmd-U0q4fz91wG5xhL5LPREW1WU0Pyf93FtmEN0',
}));

const sb = vi.hoisted(() => ({
  upsert: { args: null, result: { error: null } },
  del: { col: null, val: null, result: { error: null } },
}));

vi.mock('../../src/lib/config.js', () => ({
  get VAPID_PUBLIC_KEY() { return cfg.key; },
}));

vi.mock('../../src/lib/supabase.js', () => ({
  supabase: {
    from() {
      return {
        upsert(obj, opts) {
          sb.upsert.args = { obj, opts };
          return sb.upsert.result;
        },
        delete() {
          return {
            eq(col, val) {
              sb.del.col = col;
              sb.del.val = val;
              return sb.del.result;
            },
          };
        },
      };
    },
  },
}));

import {
  pushSupported, pushPermission, enablePush, disablePush, getSubscription,
} from '../../src/lib/push.js';

const VALID_KEY = cfg.key;

function makeSub(endpoint = 'https://push.example/abc') {
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'P256DH', auth: 'AUTHSECRET' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  };
}

// Stub a fully push-capable browser. `existingSub` is what getSubscription()
// returns; `subscribeSub` is what a fresh subscribe() resolves to.
function stubBrowser({ permission = 'default', requestResult = 'granted', existingSub = null, subscribeSub } = {}) {
  const sub = subscribeSub || makeSub();
  const reg = {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(existingSub),
      subscribe: vi.fn().mockResolvedValue(sub),
    },
  };
  vi.stubGlobal('window', { Notification: {}, PushManager: function () {} });
  vi.stubGlobal('Notification', { permission, requestPermission: vi.fn().mockResolvedValue(requestResult) });
  vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve(reg) }, userAgent: 'vitest-UA' });
  return { reg, sub, existingSub };
}

beforeEach(() => {
  cfg.key = VALID_KEY;
  sb.upsert = { args: null, result: { error: null } };
  sb.del = { col: null, val: null, result: { error: null } };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('pushSupported', () => {
  it('is false when browser push APIs are absent (Node default)', () => {
    expect(pushSupported()).toBe(false);
  });

  it('is true when serviceWorker, PushManager and Notification all exist', () => {
    stubBrowser();
    expect(pushSupported()).toBe(true);
  });
});

describe('pushPermission', () => {
  it("returns 'default' when Notification is unavailable", () => {
    expect(pushPermission()).toBe('default');
  });

  it('reflects Notification.permission when available', () => {
    stubBrowser({ permission: 'granted' });
    expect(pushPermission()).toBe('granted');
  });
});

describe('enablePush', () => {
  it('refuses when push is unsupported', async () => {
    const res = await enablePush();
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/support/i);
  });

  it('refuses when no VAPID key is configured', async () => {
    stubBrowser();
    cfg.key = '';
    const res = await enablePush();
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/configured/i);
  });

  it('refuses when notification permission is not granted', async () => {
    stubBrowser({ requestResult: 'denied' });
    const res = await enablePush();
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/permission/i);
  });

  it('subscribes and upserts the subscription on success', async () => {
    stubBrowser({ subscribeSub: makeSub('https://push.example/xyz') });
    const res = await enablePush();
    expect(res).toEqual({ ok: true });
    expect(sb.upsert.args.obj).toMatchObject({
      endpoint: 'https://push.example/xyz',
      p256dh: 'P256DH',
      auth: 'AUTHSECRET',
      user_agent: 'vitest-UA',
    });
    expect(sb.upsert.args.opts).toEqual({ onConflict: 'endpoint' });
  });

  it('surfaces a Supabase persistence error', async () => {
    stubBrowser();
    sb.upsert.result = { error: { message: 'db boom' } };
    const res = await enablePush();
    expect(res).toEqual({ ok: false, reason: 'db boom' });
  });
});

describe('disablePush', () => {
  it('deletes the row by endpoint and unsubscribes locally', async () => {
    const { existingSub } = stubBrowser({ existingSub: makeSub('https://push.example/del') });
    const res = await disablePush();
    expect(res).toEqual({ ok: true });
    expect(sb.del).toMatchObject({ col: 'endpoint', val: 'https://push.example/del' });
    expect(existingSub.unsubscribe).toHaveBeenCalled();
  });

  it('reports a failed server-side delete', async () => {
    stubBrowser({ existingSub: makeSub() });
    sb.del.result = { error: { message: 'delete failed' } };
    const res = await disablePush();
    expect(res).toEqual({ ok: false, reason: 'delete failed' });
  });

  it('is a no-op (ok) when there is no active subscription', async () => {
    stubBrowser({ existingSub: null });
    const res = await disablePush();
    expect(res).toEqual({ ok: true });
    expect(sb.del.val).toBeNull();
  });
});

describe('getSubscription', () => {
  it('returns null when push is unsupported', async () => {
    expect(await getSubscription()).toBeNull();
  });

  it('returns the active subscription when present', async () => {
    const existing = makeSub('https://push.example/cur');
    stubBrowser({ existingSub: existing });
    expect(await getSubscription()).toBe(existing);
  });
});
