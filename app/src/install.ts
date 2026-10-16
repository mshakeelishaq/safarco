// "Add SafarCo to your home screen": the browser's own install prompt where there is one (Android, desktop
// Chrome), and a short how-to on iPhone, which has no prompt.
const DISMISSED = 'safarco-install-dismissed';
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: PromptEvent | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach(f => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as PromptEvent; changed(); });
  window.addEventListener('appinstalled', () => { deferred = null; changed(); });
}

export const onInstallChange = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const isInstalled = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
export const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
export const canPrompt = () => !!deferred;
export const wasDismissed = () => { try { return localStorage.getItem(DISMISSED) === '1'; } catch { return false; } };
export const dismissInstall = () => { try { localStorage.setItem(DISMISSED, '1'); } catch { /* storage blocked */ } changed(); };
/** Shows the browser's install prompt; true if the traveller installed. */
export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred; deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice; changed();
  return outcome === 'accepted';
}

/** How this phone or computer adds SafarCo: the browser's own prompt, or the steps to follow. */
export type InstallHow = 'installed' | 'prompt' | 'ios-safari' | 'ios-other' | 'android' | 'inapp' | 'desktop';
export function installHow(): InstallHow {
  if (isInstalled()) return 'installed';
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  // Instagram, Facebook, TikTok and similar open links in their own browser, which can't install apps.
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|Snapchat|TikTok|BytedanceWebview|; wv\)/i.test(ua)) return 'inapp';
  if (deferred) return 'prompt';
  if (isIOS()) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-other' : 'ios-safari';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}
const OPEN = 'sc-install-open';
/** "Install the app" anywhere: the browser's prompt if it has one, else a sheet with the steps for this phone. */
export async function startInstall() {
  // Android Chrome gets its one-tap install ready a moment after the page loads: wait for it rather than
  // falling back to the menu steps, which often only add a shortcut.
  if (!deferred && installHow() === 'android') await new Promise<void>(done => {
    const off = onInstallChange(() => { if (deferred) { off(); clearTimeout(t); done(); } });
    const t = setTimeout(() => { off(); done(); }, 4000);
  });
  if (installHow() === 'prompt') { await promptInstall(); return; }
  window.dispatchEvent(new Event(OPEN));
}
export const onInstallOpen = (f: () => void) => { window.addEventListener(OPEN, f); return () => window.removeEventListener(OPEN, f); };

/**
 * The install offer (the website's app bar or the planner's card) appears once, on one page, ever.
 * The Get the app page and "Install the app" in My trips stay for anyone who wants it later.
 */
const OFFERED = 'safarco-install-offered';
let offerNow: boolean | null = null;
export function offerInstallNow() {
  if (offerNow === null) {
    let before = true;
    try { before = !!(localStorage.getItem(OFFERED) || localStorage.getItem(DISMISSED) || localStorage.getItem('safarco-appbar-closed')); if (!before) localStorage.setItem(OFFERED, '1'); } catch { /* storage blocked: don't nag */ }
    offerNow = !before && !isInstalled();
  }
  return offerNow;
}
