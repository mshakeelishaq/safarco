// Approved reviews of trusted hotels and drivers, summarised for the trip screen.
import type { Review, ReviewKind } from './cloud';

let all: Review[] = [];
export const setReviews = (list: Review[]) => { all = Array.isArray(list) ? list.filter(r => r && r.status === 'approved') : []; };

export interface RatingSummary { avg: number; count: number; text: string; latest: { key: string; stars: number; comment: string; author: string; date: string }[] }

/** Average stars, count and the latest comments for one hotel or driver. */
export function ratingOf(kind: ReviewKind, id: string): RatingSummary {
  const r = all.filter(x => x.item_kind === kind && x.item_id === id);
  const avg = r.length ? Math.round(r.reduce((a, x) => a + x.rating, 0) / r.length * 10) / 10 : 0;
  return {
    avg, count: r.length, text: r.length ? `${avg.toFixed(1)} · ${r.length} review${r.length > 1 ? 's' : ''}` : 'No reviews yet',
    latest: r.filter(x => x.comment.trim()).slice(0, 2).map(x => ({ key: String(x.id), stars: x.rating, comment: x.comment, author: x.author.split(' ')[0] || 'Traveller',
      date: new Date(x.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) }))
  };
}
