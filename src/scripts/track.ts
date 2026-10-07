// 利用の記録。全ページで読み込む。
// - 端末の識別はブラウザごとのランダムID（localStorage）。教室の PC は Google アカウントを共有しているので使わない。
// - ?from=wonder で一度来た端末は、以後ずっと referrer=wonder。
// - 記録は data-text-id の付いたリンク（＝テキスト本体を開く操作）を押したときだけ。ページを開いただけでは記録しない。
// - 重複はここではじかない（判定は Apps Script 側の解析で行う）。

const DEVICE_KEY = 'textSite.deviceId';
const REFERRER_KEY = 'textSite.referrer';
const memory: Record<string, string> = {};

function load(key: string): string | null {
  try {
    const v = localStorage.getItem(key);
    if (v) return v;
  } catch {}
  return memory[key] ?? null;
}

function save(key: string, value: string) {
  memory[key] = value;
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function deviceId(): string {
  let id = load(DEVICE_KEY);
  if (!id) save(DEVICE_KEY, (id = newId()));
  return id;
}

function referrer(): 'wonder' | 'general' {
  return load(REFERRER_KEY) === 'wonder' ? 'wonder' : 'general';
}

function record(endpoint: string, textId: string) {
  const body = JSON.stringify({ device_id: deviceId(), text_id: textId, referrer: referrer() });
  // text/plain にして CORS のプリフライトを避ける。sendBeacon はページ遷移後も送信を続ける。
  try {
    if (navigator.sendBeacon?.(endpoint, new Blob([body], { type: 'text/plain;charset=utf-8' }))) return;
  } catch {}
  try {
    fetch(endpoint, { method: 'POST', body, mode: 'no-cors', keepalive: true });
  } catch {}
}

const endpoint = document.documentElement.dataset.endpoint ?? '';

if (new URLSearchParams(location.search).get('from') === 'wonder') save(REFERRER_KEY, 'wonder');
deviceId();

if (endpoint) {
  document.addEventListener('click', (e) => {
    const link = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[data-text-id]');
    if (link?.dataset.textId) record(endpoint, link.dataset.textId);
  });
}
