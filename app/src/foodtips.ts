// Places to eat travellers suggested and the admin approved, by destination.
import type { FoodTip } from './cloud';

let all: FoodTip[] = [];
export const setFoodTips = (list: FoodTip[]) => { all = Array.isArray(list) ? list.filter(r => r && r.status === 'approved') : []; };
/** The newest approved tips for a place. */
export const foodTipsFor = (dest: string) => all.filter(x => x.dest === dest).slice(0, 6);
