// Prices researched online on 12 Oct 2026 from news reports of OGRA/NHA notices, operator
// websites and booking sites. The admin page offers them as a starting point: the admin
// reviews them and saves. Only sections with recent sources are marked as checked.
import type { PriceList, Section } from './prices';

export const RESEARCHED_ON = '2026-10-12';

/** Sections whose figures had 2026 sources. Flights and most jeep trips did not. */
export const RESEARCHED_SECTIONS: Section[] = ['fuel', 'tolls', 'stays', 'hire', 'coach'];

export const RESEARCHED: { [K in keyof PriceList]?: Partial<PriceList[K]> } = {
  // OGRA price for 10 Oct 2026, as reported by Pakera and petrolfuelprices.com.pk.
  fuel: { petrol: 398.3, diesel: 396.24 },
  // NHA revisions of 5 Jul (M-2: Rs 1,430) and 10 Jul 2026 (M-1 700, M-3 1,000, M-4 1,350,
  // M-5 1,500, M-14 800, E-35 400), Swat Expressway Rs 270, M-9 Rs 460. Roads that cover
  // part of a motorway are priced by distance; M-Tag rates (cars without M-Tag pay more).
  tolls: {
    'KHI-HYD': 460, 'SKR-MUL': 1500, 'MUL-FSD': 1100, 'FSD-ISB': 1250, 'MUL-LHR': 1450, 'LHR-ISB': 1430, 'FSD-LHR': 500,
    'ISB-PSH': 700, 'PSH-MGR': 500, 'ISB-MGR': 750, 'ISB-ABT': 500, 'ABT-MNS': 130, 'DIK-ISB': 800, 'ISB-CKD': 750, 'PSH-CKD': 500
  },
  // Booking sites and hotel lists for Naran, Hunza and Skardu (2026).
  stays: { backpacker: { night: 3000, meal: 1200 }, standard: { night: 10000, meal: 2500 }, premium: { night: 25000, meal: 5500 } },
  // Rent-a-car operators in Islamabad and Skardu (Sher Brothers, Pak Tours, Skardu Car Rental), with driver, fuel extra.
  hire: { rentcar: 8000, rentcarDriver: 2000, rent4x4: 22000, rent4x4Driver: 2500, coaster: 26000, coasterDriver: 3000, carAtDestination: 15000 },
  // Daewoo Lahore → Rawalpindi Rs 2,470 (375 km); Faisal Movers Islamabad → Gilgit Rs 4,000–6,000 (600 km).
  coach: { perKmFlat: 6.5, perKmMountain: 9 },
  // Sastaticket fares for 2026: Islamabad → Skardu about Rs 17,600–20,600, Karachi → Skardu about Rs 30,900,
  // Karachi ⇄ Islamabad about Rs 17,600–19,000. Not marked as checked: other routes had no 2026 source.
  fares: { Skardu: { ISB: 20000, KHI: 31000 }, Islamabad: { KHI: 19000 }, Karachi: { ISB: 19000 } },
  // Naran fare notice (Assistant Commissioner Balakot): Saif-ul-Malook Rs 5,500 return. Deosai jeep Rs 15,000–25,000;
  // Raikot ⇄ Tato about Rs 8,500 a few years ago. Not marked as checked: other jeep trips had no source.
  jeeps: { saif: 5500, deosai: 18000, deosaiA: 18000, raikot: 9000 }
};

/** The admin's list with the researched figures written over it. */
export function withResearched(list: PriceList): PriceList {
  const c: PriceList = JSON.parse(JSON.stringify(list)), r = RESEARCHED;
  Object.assign(c.fuel, r.fuel); Object.assign(c.tolls, r.tolls); Object.assign(c.hire, r.hire); Object.assign(c.coach, r.coach); Object.assign(c.jeeps, r.jeeps);
  Object.entries(r.stays || {}).forEach(([t, v]) => Object.assign(c.stays[t as keyof PriceList['stays']], v));
  Object.entries(r.fares || {}).forEach(([d, f]) => { if (c.fares[d]) Object.assign(c.fares[d], f); });
  RESEARCHED_SECTIONS.forEach(s => { c.checked[s] = RESEARCHED_ON; });
  return c;
}
