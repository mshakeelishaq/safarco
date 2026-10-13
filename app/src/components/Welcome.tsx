// First-visit welcome: language, a full-screen photo of Pakistan, and one tap to start.
// Shown once per device; "About SafarCo" in My trips opens it again.
// Photos © shakeelnaturegraphy, cross-fading with a slow zoom, starting with the current season.
import { useEffect, useState } from 'react';
import { IG_HANDLE, IG_PROFILE } from '../contact';
import { css } from '../lib/css';
import { t } from '../i18n';
import { WISHES, wishPlaces, type WishId } from '../engine/seasons';

export const WELCOMED = 'safarco-welcomed';
export const seenWelcome = () => { try { return localStorage.getItem(WELCOMED) === '1'; } catch { return true; } };

/** `months`: when the photo leads the slideshow. `only`: shown only in those months (extra photos of the season). */
interface Photo { src: string; icon: string; caption: string; place: string; pos: string; months: number[]; only?: boolean }
// A function so the captions are translated at render time (the language can change).
const photos = (): Photo[] => [
  { src: '/photos/autumn-hunza.webp', icon: 'ph-leaf', caption: t('Autumn gold'), place: t('Hunza, under Rakaposhi'), pos: '52% 50%', months: [10, 11] },
  { src: '/photos/hunza-orchards.webp', icon: 'ph-leaf', caption: t('Autumn colours'), place: 'Gilgit-Baltistan', pos: '50% 50%', months: [10, 11], only: true },
  { src: '/photos/altit-fort.webp', icon: 'ph-castle-turret', caption: t('Autumn light'), place: 'Altit Fort, Hunza', pos: '62% 50%', months: [10, 11], only: true },
  { src: '/photos/hunza-golden-light.webp', icon: 'ph-sun', caption: t('Autumn light'), place: 'Gilgit-Baltistan', pos: '60% 50%', months: [10, 11], only: true },
  { src: '/photos/hunza-autumn-peaks.webp', icon: 'ph-leaf', caption: t('Autumn colours'), place: 'Gilgit-Baltistan', pos: '50% 50%', months: [10, 11], only: true },
  { src: '/photos/hunza-autumn-valley.webp', icon: 'ph-leaf', caption: t('Autumn colours'), place: 'Gilgit-Baltistan', pos: '40% 50%', months: [10, 11], only: true },
  { src: '/photos/snowfall.webp', icon: 'ph-snowflake', caption: t('Snowfall'), place: t('The northern valleys'), pos: '45% 50%', months: [12, 1, 2] },
  { src: '/photos/blossom.webp', icon: 'ph-flower', caption: t('Blossom season'), place: 'Gilgit-Baltistan', pos: '50% 55%', months: [3, 4] },
  { src: '/photos/green-valley.webp', icon: 'ph-tree-evergreen', caption: t('Lush green valleys'), place: t('The northern valleys'), pos: '45% 50%', months: [5, 6, 7, 8, 9] },
  { src: '/photos/umbrella-waterfall.webp', icon: 'ph-drop', caption: t('Waterfalls'), place: 'Umbrella Waterfall, Abbottabad', pos: '50% 50%', months: [6, 7, 8] },
  { src: '/photos/sea-sunset.webp', icon: 'ph-waves', caption: t('Sea and sunsets'), place: t('Karachi coast'), pos: '56% 50%', months: [] },
  { src: '/photos/mosque-arches.webp', icon: 'ph-mosque', caption: t('Heritage'), place: 'Sindh', pos: '28% 50%', months: [] }
];
const SLIDE_MS = 6000;

const chip = 'display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:12px;background:rgba(255,255,255,.14);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-size:12px;font-weight:700;white-space:nowrap';

export function Welcome({ open, onStart, onGuide, onWish, lang, onLang }: { open: boolean; onStart: () => void; onGuide: () => void; onWish: (id: WishId) => void; lang: string; onLang: (l: 'en' | 'ur') => void }) {
  // Hunza first, then this season's photos (a random 2 of them, so each visit looks a little different), then
  // one photo of every other season. Extra photos of a season only show in that season.
  const month = new Date().getMonth() + 1;
  const [order] = useState(() => {
    // The app always opens on Hunza under Rakaposhi, then this season's photos.
    const all = photos(), lead = all[0], now = all.filter(p => p !== lead && p.months.includes(month)).sort(() => Math.random() - .5).slice(0, 2);
    return [lead, ...now, ...all.filter(p => p !== lead && !p.only && !p.months.includes(month))].map(p => p.src);
  });
  const byId = new Map(photos().map(p => [p.src, p])), list = order.map(src => byId.get(src)!);
  const [i, setI] = useState(0), [seen, setSeen] = useState<number[]>([0]);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setI(x => (x + 1) % list.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [open, list.length]);
  // Load each photo just before it shows, so the first screen stays light on mobile data.
  useEffect(() => { const next = (i + 1) % list.length; setSeen(s => s.includes(i) && s.includes(next) ? s : [...new Set([...s, i, next])]); }, [i, list.length]);
  if (!open) return null;

  const best = WISHES.find(w => w.months.includes(month)) || null;
  const bestPlaces = best ? wishPlaces(best.id).filter(p => !p.h.caution).slice(0, 3).map(p => p.name).join(' · ') : '';
  const p = list[i];
  return (
    <div role="dialog" aria-modal="true" aria-label={t('Welcome to SafarCo')} style={css('position:absolute;inset:0;z-index:40;overflow:hidden;background:#08303F;color:#fff')}>
      <div aria-hidden="true" style={css('position:absolute;inset:0')}>
        {list.map((ph, k) => seen.includes(k) && (
          <img key={ph.src} src={ph.src} alt="" decoding="async" className={k === i ? 'sc-kb' : undefined}
            style={css(`position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${ph.pos};opacity:${k === i ? 1 : 0};transition:opacity 1.4s ease`)} />
        ))}
        <div style={css('position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,18,26,.55) 0%,rgba(4,18,26,0) 22%,rgba(4,18,26,0) 38%,rgba(4,18,26,.78) 62%,rgba(4,18,26,.95) 100%)')} />
      </div>

      <div style={css('position:relative;height:100%;overflow-y:auto;scrollbar-width:none')}>
        <div style={css('min-height:100%;box-sizing:border-box;max-width:460px;margin:0 auto;display:flex;flex-direction:column;padding:calc(20px + env(safe-area-inset-top)) 20px calc(18px + env(safe-area-inset-bottom))')}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:10px')}>
            <div style={css('display:flex;align-items:center;gap:8px')}>
              <img src="/icon.svg" alt="" width="36" height="36" style={css('border-radius:10px;box-shadow:0 6px 16px -6px rgba(0,0,0,.6)')} />
              <span style={css('font-family:var(--fontH);font-size:20px;font-weight:700;letter-spacing:-.02em;text-shadow:0 1px 8px rgba(0,0,0,.4)')}>SafarCo</span>
            </div>
            {/* Language first, readable in both languages. */}
            <div role="radiogroup" aria-label="Language · Zabaan" style={css('display:flex;padding:3px;border-radius:14px;background:rgba(0,0,0,.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.25)')}>
              {([['en', 'English'], ['ur', 'Roman Urdu']] as const).map(([id, label]) => (
                <button key={id} role="radio" aria-checked={lang === id} onClick={() => onLang(id)} style={css(`min-height:36px;padding:0 12px;border-radius:11px;border:0;background:${lang === id ? '#FFC75F' : 'transparent'};color:${lang === id ? '#2A1A00' : '#fff'};font-size:12px;font-weight:800;cursor:pointer;transition:all .2s`)}>{label}</button>
              ))}
            </div>
          </div>

          <div style={css('flex:1;min-height:180px')} />

          <div key={p.src} className="sc-fadein" style={css(chip + ';align-self:flex-start')}><i className={`ph-fill ${p.icon}`} style={css('color:#FFD27A;font-size:14px')} />{p.caption} · {p.place}</div>
          <div aria-hidden="true" style={css('display:flex;gap:5px;margin-top:10px')}>{list.map((_, k) => <span key={k} style={css(`height:3px;border-radius:2px;width:${k === i ? 22 : 8}px;background:${k === i ? '#FFC75F' : 'rgba(255,255,255,.4)'};transition:all .4s`)} />)}</div>

          <h1 style={css('margin:16px 0 0;font-family:var(--fontH);font-weight:600;font-size:36px;line-height:1.08;letter-spacing:-.02em;text-shadow:0 2px 14px rgba(0,0,0,.35)')}>{t('Where to next?')}</h1>
          <p style={css('margin:8px 0 0;font-size:16px;line-height:1.45;font-weight:600;opacity:.92')}>{t('Your budget. Your days. Your perfect trip across Pakistan.')}</p>

          {best && (
            <button onClick={() => onWish(best.id)} style={css('margin-top:16px;display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:18px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.14);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff;text-align:left;cursor:pointer')}>
              <span style={css(`width:40px;height:40px;flex:none;border-radius:13px;background:${best.grad};display:flex;align-items:center;justify-content:center;font-size:21px`)}><i className={`ph-fill ${best.icon}`} /></span>
              <span style={css('flex:1;min-width:0')}>
                <span style={css('display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#FFD27A')}>{t('Best right now')}</span>
                <span style={css('display:block;font-size:15px;font-weight:800;margin-top:1px')}>{t(best.label)}</span>
                {bestPlaces && <span style={css('display:block;font-size:12px;font-weight:600;opacity:.85;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>{bestPlaces}</span>}
              </span>
              <i className="ph-bold ph-arrow-right" style={css('font-size:18px;flex:none')} />
            </button>
          )}

          <div style={css('display:flex;flex-wrap:wrap;gap:6px;margin-top:14px')}>
            <span style={css(chip)}><i className="ph-fill ph-wallet" style={css('color:#FFD27A')} />{t('Fits your budget')}</span>
            <span style={css(chip)}><i className="ph-fill ph-calendar-check" style={css('color:#FFD27A')} />{t('Day by day')}</span>
            <span style={css(chip)}><i className="ph-fill ph-cloud-sun" style={css('color:#FFD27A')} />{t('Weather and roads')}</span>
            <span style={css(chip)}><i className="ph-fill ph-wifi-slash" style={css('color:#FFD27A')} />{t('Works offline')}</span>
          </div>

          <button onClick={onStart} style={css('margin-top:18px;width:100%;height:56px;flex:none;border-radius:18px;border:0;background:#FFC75F;color:#2A1A00;font-size:16px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 16px 32px -14px rgba(255,199,95,.8)')}>{t('Start planning')}<i className="ph-bold ph-arrow-right" /></button>
          <button onClick={onGuide} style={css('width:100%;margin-top:8px;height:46px;flex:none;border-radius:16px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:#fff;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px')}><i className="ph-fill ph-leaf" />{t('Where’s best this season?')}</button>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;font-size:11px;font-weight:700;opacity:.85')}>
            <a href={IG_PROFILE} target="_blank" rel="noopener" style={css('display:inline-flex;align-items:center;gap:5px;min-height:32px;color:#fff;text-decoration:none')}><i className="ph-bold ph-instagram-logo" style={css('font-size:14px')} />{t('Photos © {handle}', { handle: IG_HANDLE })}</a>
            <span>{t('Free · no sign-up')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
