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
