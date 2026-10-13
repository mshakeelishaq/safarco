// Reference data for SafarCo, carried over from the SafarCo App v7 design.
// Road km, speeds, tolls, fares, hotel names and rates are estimates from the
// design and need checking against real figures before launch.

import { DEST_PATCH, IMPORTED_DESTS, IMPORTED_ON, PLACE_INFO as IMPORTED_INFO, STOP_PATCH, type PlaceInfo } from './imported';

export type VehicleId = 'sedan' | 'suv' | 'bike' | 'public' | 'air' | 'rentcar' | 'rent4x4' | 'coaster';
export type TierId = 'backpacker' | 'standard' | 'premium';
export type Mode = 'know' | 'suggest';
/** What the traveller already has: their own car, SUV or bike, or nothing (SafarCo suggests the best way). */
export type Have = 'any' | 'car' | 'suv' | 'bike';
export type StopKind = 'drive' | 'food' | 'tea' | 'view' | 'fuel' | 'go' | 'bed' | 'pin' | 'plane';

export interface Vehicle {
  short: string; icon: string; label: string; sub: string;
  mileage?: number; mtn?: number; cap?: number; rate?: number; allow?: number; diesel?: boolean; tollX?: number;
}
export interface Tier { label: string; night: number; meal: number }
export interface TripConfig { id: string; name: string; vehicle: VehicleId; tier: TierId }
/** [name, tier, note] */
export type Hotel = [string, string, string];
/** [km from the edge's start, kind, label, note] */
export type EdgeStop = [number, StopKind, string, string];
/** [a, b, road km, avg km/h, car toll one-way PKR, mountain 0/1, road name, open months?] */
export type Edge = [string, string, number, number, number, number, string, number[]?];
/** [name, where, description, open months?, link?] */
export type Place = [string, string, string, (number[] | null)?, string?];
/** [id, label, sub, PKR per jeep, open months?] */
export type Jeep = [string, string, string, number, number[]?];
export interface Terrain { seed: number; amp: number; rise: number; wig: number }

export interface DestInput {
  id: string; name: string; town?: string; region: string; lat: number; lon: number; ft?: number | null; ftEst?: number;
  node?: string | null; air?: string | null; airNote?: string; hub?: number; icon?: string; generic?: boolean;
  best?: number[] | null; warn?: [number[], string] | null; terrain?: Terrain;
  hotels?: Hotel[] | null; places?: Place[]; eat?: string; jeeps?: Jeep[]; livePlaces?: boolean;
  /** Day trips the way people do them: place names in visiting order, and a tip for the day. */
  days?: { places: string[]; note?: string; stay?: string; leave?: number }[];
  /** False for guides imported from research and not yet checked by SafarCo. */
  checked?: boolean;
  /** A short road or season note for imported guides. */
  guideNote?: string;
}

/** Months a to b inclusive, wrapping past December. */
export const R = (a: number, b: number): number[] => { const o: number[] = []; for (let m = a; ; m = m % 12 + 1) { o.push(m); if (m === b) break; } return o; };

export const PETROL: number = 387.40;
/** Trip styles for travellers with their own vehicle: only that vehicle, at each kind of stay. */
export const OWN_CONFIGS: Record<Exclude<Have, 'any'>, TripConfig[]> = {
  car: [{ id: 'value', name: 'Budget drive', vehicle: 'sedan', tier: 'backpacker' }, { id: 'std', name: 'Standard', vehicle: 'sedan', tier: 'standard' }, { id: 'carp', name: 'Premium', vehicle: 'sedan', tier: 'premium' }],
  suv: [{ id: 'suvb', name: 'Budget drive', vehicle: 'suv', tier: 'backpacker' }, { id: 'comfort', name: 'Comfort 4x4', vehicle: 'suv', tier: 'standard' }, { id: 'premium', name: 'Premium', vehicle: 'suv', tier: 'premium' }],
  bike: [{ id: 'bikeb', name: 'Backpacker', vehicle: 'bike', tier: 'backpacker' }, { id: 'bikes', name: 'Standard', vehicle: 'bike', tier: 'standard' }]
};
/** The vehicle a traveller's own transport means. */
export const HAVE_VEHICLE: Record<Exclude<Have, 'any'>, VehicleId> = { car: 'sedan', suv: 'suv', bike: 'bike' };
export const VEH: Record<VehicleId, Vehicle> = {
  sedan: { short: 'Sedan', icon: 'ph-car-profile', label: 'Standard Sedan / Hatchback', sub: 'Corolla GLi, City, Alto', mileage: 13, mtn: 9, cap: 4 },
  suv: { short: '4x4 SUV', icon: 'ph-jeep', label: '4x4 SUV', sub: 'Prado, Fortuner, Land Cruiser', mileage: 8, mtn: 5.5, cap: 6 },
  bike: { short: 'Motorbike', icon: 'ph-motorcycle', label: 'Motorbike', sub: 'CG-125, YBR, heavy bikes', mileage: 45, mtn: 30, cap: 2 },
  public: { short: 'Coach', icon: 'ph-bus', label: 'Public Transport', sub: 'Daewoo, NATCO, coasters', mileage: 0 },
  air: { short: 'By air', icon: 'ph-airplane-tilt', label: 'By air', sub: 'PIA to Skardu / Gilgit' },
  rentcar: { short: 'Hire car', icon: 'ph-steering-wheel', label: 'Rent a car + driver', sub: 'Corolla / City', mileage: 13, mtn: 9, cap: 4, rate: 12000, allow: 2000 },
  rent4x4: { short: 'Hire 4x4', icon: 'ph-jeep', label: 'Rent a 4x4 + driver', sub: 'Prado / Land Cruiser', mileage: 8, mtn: 5.5, cap: 6, rate: 35000, allow: 2500 },
  coaster: { short: 'Coaster', icon: 'ph-van', label: 'Rent a coaster + driver', sub: 'Toyota Coaster, 22 seats', mileage: 6, mtn: 4.2, cap: 22, rate: 35000, allow: 3000, diesel: true, tollX: 2.5 }
};
export const TIERS: Record<TierId, Tier> = {
  backpacker: { label: 'Backpacker', night: 3500, meal: 1200 },
  standard: { label: 'Standard', night: 9000, meal: 2500 },
  premium: { label: 'Premium', night: 28000, meal: 5500 }
};
export const GRADS: [string, string][] = [['var(--g)', '#0FA678'], ['var(--amb)', '#FF7A3D'], ['var(--cor)', '#FF4F7B'], ['var(--vio)', '#5B6CFF']];
export const MODES: { id: Mode; icon: string; label: string; sub: string }[] = [
  { id: 'know', icon: 'ph-map-pin', label: 'I know my destination', sub: 'Search any city or tourist spot' },
  { id: 'suggest', icon: 'ph-sparkle', label: 'Suggest a trip for me', sub: 'Matched to your days and budget' }];
export const CONFIGS: TripConfig[] = [
  { id: 'coach', name: 'Backpacker', vehicle: 'public', tier: 'backpacker' },
  { id: 'value', name: 'Budget drive', vehicle: 'sedan', tier: 'backpacker' },
  { id: 'std', name: 'Standard', vehicle: 'sedan', tier: 'standard' },
  { id: 'comfort', name: 'Comfort 4x4', vehicle: 'suv', tier: 'standard' },
  { id: 'premium', name: 'Premium', vehicle: 'suv', tier: 'premium' },
  { id: 'hire', name: 'Hired car', vehicle: 'rentcar', tier: 'standard' },
  { id: 'fly', name: 'Fly in', vehicle: 'air', tier: 'standard' },
  { id: 'group', name: 'Group coaster', vehicle: 'coaster', tier: 'standard' }];
export const TIER_G: Record<TierId, string> = { backpacker: 'linear-gradient(135deg,#FFB547,#FF7A3D)', standard: 'linear-gradient(135deg,#2EE59D,#0FA678)', premium: 'linear-gradient(135deg,#9B7BFF,#5B6CFF)' };
export const POPULAR: string[] = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Hyderabad', 'Gujranwala'];
export const BASE_CITIES: [string, string, number, number][] = [['Islamabad','Capital',33.69,73.05],['Lahore','Punjab',31.55,74.34],['Faisalabad','Punjab',31.42,73.08],['Rawalpindi','Punjab',33.60,73.04],['Gujranwala','Punjab',32.16,74.19],['Multan','Punjab',30.20,71.47],['Sialkot','Punjab',32.49,74.53],['Bahawalpur','Punjab',29.40,71.68],['Sargodha','Punjab',32.08,72.67],['Sheikhupura','Punjab',31.71,73.98],['Jhang','Punjab',31.27,72.32],['Gujrat','Punjab',32.57,74.08],['Sahiwal','Punjab',30.66,73.11],['Rahim Yar Khan','Punjab',28.42,70.30],['Kasur','Punjab',31.12,74.45],['Okara','Punjab',30.81,73.45],['Dera Ghazi Khan','Punjab',30.05,70.63],['Chiniot','Punjab',31.72,72.98],['Kamoke','Punjab',31.97,74.22],['Mandi Bahauddin','Punjab',32.58,73.49],['Jhelum','Punjab',32.94,73.73],['Sadiqabad','Punjab',28.31,70.13],['Khanewal','Punjab',30.30,71.93],['Hafizabad','Punjab',32.07,73.69],['Muzaffargarh','Punjab',30.07,71.19],['Khanpur','Punjab',28.65,70.66],['Gojra','Punjab',31.15,72.69],['Bahawalnagar','Punjab',29.99,73.25],['Vehari','Punjab',30.04,72.35],['Attock','Punjab',33.77,72.36],['Chakwal','Punjab',32.93,72.86],['Mianwali','Punjab',32.58,71.54],['Bhakkar','Punjab',31.63,71.06],['Layyah','Punjab',30.96,70.94],['Toba Tek Singh','Punjab',30.97,72.48],['Narowal','Punjab',32.10,74.87],['Pakpattan','Punjab',30.34,73.39],['Lodhran','Punjab',29.54,71.63],['Murree','Punjab',33.91,73.39],['Khushab','Punjab',32.30,72.35],['Rajanpur','Punjab',29.10,70.33],['Wazirabad','Punjab',32.44,74.12],['Taxila','Punjab',33.75,72.80],['Burewala','Punjab',30.17,72.65],['Daska','Punjab',32.32,74.35],['Kharian','Punjab',32.81,73.86],['Arifwala','Punjab',30.29,73.07],['Chishtian','Punjab',29.80,72.86],['Kot Addu','Punjab',30.47,70.97],['Jaranwala','Punjab',31.33,73.42],['Pattoki','Punjab',31.02,73.85],['Talagang','Punjab',32.93,72.42],['Karachi','Sindh',24.86,67.01],['Hyderabad','Sindh',25.40,68.37],['Sukkur','Sindh',27.70,68.86],['Larkana','Sindh',27.56,68.21],['Nawabshah','Sindh',26.24,68.41],['Mirpur Khas','Sindh',25.53,69.01],['Jacobabad','Sindh',28.28,68.44],['Shikarpur','Sindh',27.96,68.64],['Khairpur','Sindh',27.53,68.76],['Dadu','Sindh',26.73,67.78],['Thatta','Sindh',24.75,67.92],['Badin','Sindh',24.66,68.84],['Sanghar','Sindh',26.05,68.95],['Umerkot','Sindh',25.36,69.74],['Tando Adam','Sindh',25.77,68.66],['Tando Allahyar','Sindh',25.46,68.72],['Mithi','Sindh',24.74,69.80],['Ghotki','Sindh',28.01,69.32],['Kotri','Sindh',25.37,68.31],['Kandhkot','Sindh',28.24,69.18],['Moro','Sindh',26.66,68.00],['Sehwan','Sindh',26.42,67.86],['Peshawar','Khyber Pakhtunkhwa',34.01,71.58],['Mardan','Khyber Pakhtunkhwa',34.20,72.04],['Abbottabad','Khyber Pakhtunkhwa',34.15,73.21],['Mingora','Khyber Pakhtunkhwa',34.78,72.36],['Kohat','Khyber Pakhtunkhwa',33.58,71.44],['Dera Ismail Khan','Khyber Pakhtunkhwa',31.83,70.90],['Mansehra','Khyber Pakhtunkhwa',34.33,73.20],['Nowshera','Khyber Pakhtunkhwa',34.02,71.98],['Swabi','Khyber Pakhtunkhwa',34.12,72.47],['Charsadda','Khyber Pakhtunkhwa',34.15,71.73],['Bannu','Khyber Pakhtunkhwa',32.99,70.60],['Haripur','Khyber Pakhtunkhwa',33.99,72.93],['Chitral','Khyber Pakhtunkhwa',35.85,71.79],['Dir','Khyber Pakhtunkhwa',35.21,71.88],['Batkhela','Khyber Pakhtunkhwa',34.62,71.97],['Timergara','Khyber Pakhtunkhwa',34.83,71.84],['Karak','Khyber Pakhtunkhwa',33.12,71.09],['Hangu','Khyber Pakhtunkhwa',33.53,71.06],['Lakki Marwat','Khyber Pakhtunkhwa',32.61,70.91],['Tank','Khyber Pakhtunkhwa',32.22,70.38],['Besham','Khyber Pakhtunkhwa',34.92,72.87],['Naran','Khyber Pakhtunkhwa',34.91,73.65],['Parachinar','Khyber Pakhtunkhwa',33.90,70.10],['Battagram','Khyber Pakhtunkhwa',34.68,73.02],['Malakand','Khyber Pakhtunkhwa',34.57,71.93],['Quetta','Balochistan',30.18,67.00],['Gwadar','Balochistan',25.13,62.32],['Turbat','Balochistan',26.00,63.05],['Khuzdar','Balochistan',27.81,66.61],['Hub','Balochistan',25.05,66.89],['Chaman','Balochistan',30.92,66.45],['Sibi','Balochistan',29.54,67.88],['Zhob','Balochistan',31.34,69.45],['Loralai','Balochistan',30.37,68.60],['Panjgur','Balochistan',26.97,64.09],['Kharan','Balochistan',28.58,65.42],['Dera Murad Jamali','Balochistan',28.55,68.22],['Nushki','Balochistan',29.55,66.02],['Mastung','Balochistan',29.80,66.85],['Kalat','Balochistan',29.03,66.59],['Ziarat','Balochistan',30.38,67.73],['Pasni','Balochistan',25.26,63.47],['Usta Muhammad','Balochistan',28.18,68.04],['Gilgit','Gilgit-Baltistan',35.92,74.31],['Skardu','Gilgit-Baltistan',35.30,75.63],['Chilas','Gilgit-Baltistan',35.42,74.10],['Aliabad','Gilgit-Baltistan',36.31,74.62],['Karimabad','Gilgit-Baltistan',36.32,74.66],['Gahkuch','Gilgit-Baltistan',36.17,73.76],['Khaplu','Gilgit-Baltistan',35.15,76.33],['Astore','Gilgit-Baltistan',35.37,74.86],['Shigar','Gilgit-Baltistan',35.42,75.73],['Muzaffarabad','Azad Kashmir',34.37,73.47],['Mirpur','Azad Kashmir',33.15,73.75],['Rawalakot','Azad Kashmir',33.86,73.76],['Kotli','Azad Kashmir',33.52,73.90],['Bagh','Azad Kashmir',33.98,73.78],['Bhimber','Azad Kashmir',32.97,74.08],['Athmuqam','Azad Kashmir',34.58,73.90]];
export const NODES: Record<string, [number, number]> = { KHI: [24.86, 67.01], HYD: [25.40, 68.37], SKR: [27.70, 68.86], MUL: [30.20, 71.47], FSD: [31.42, 73.08], LHR: [31.55, 74.34], ISB: [33.69, 73.05], PSH: [34.01, 71.58],
  MGR: [34.78, 72.36], KLM: [35.49, 72.58], MNS: [34.33, 73.20], NRN: [34.91, 73.65], CHL: [35.42, 74.10], BSM: [34.92, 72.87], RKT: [35.47, 74.60], GLT: [35.92, 74.31], KRM: [36.32, 74.66],
  SKD: [35.30, 75.63], QTA: [30.18, 67.00], DGK: [30.05, 70.63], DIK: [31.83, 70.90], GWD: [25.13, 62.32], MZD: [34.37, 73.47],
  MRE: [33.91, 73.39], KEL: [34.82, 74.35], CKD: [34.66, 72.03], DIR: [35.21, 71.88], CTR: [35.85, 71.79], KHP: [35.15, 76.33], ORM: [25.21, 64.64], PSU: [36.47, 74.89], ZRT: [30.38, 67.73], KML: [25.40, 65.47], MJD: [27.33, 68.14], MJB: [34.80, 72.57], LRL: [30.37, 68.60], KZD: [27.81, 66.61],
  ABT: [34.15, 73.21], KWI: [34.60, 73.50], SHG: [34.64, 73.46], NTG: [34.07, 73.38], AST: [35.37, 74.86], NLT: [36.16, 74.18], PHD: [36.16, 72.94], MSJ: [36.28, 72.52], SST: [36.69, 74.82], KJB: [36.85, 75.42], BMB: [35.73, 71.73], THL: [35.47, 72.24], KMT: [35.53, 72.22], ZHB: [31.34, 69.45], MTH: [24.74, 69.80], BWP: [29.40, 71.68], TBT: [26.00, 63.05] };
export const NODE_INFO: Record<string, [string, number]> = { KHI: ['Karachi', 30], HYD: ['Hyderabad', 80], SKR: ['Sukkur', 220], MUL: ['Multan', 400], FSD: ['Faisalabad', 600], LHR: ['Lahore', 710], ISB: ['Islamabad', 1770], PSH: ['Peshawar', 1100],
  MGR: ['Mingora, Swat', 3200], KLM: ['Kalam', 6560], MNS: ['Mansehra', 3570], NRN: ['Naran', 7900], CHL: ['Chilas', 4100], BSM: ['Besham', 2000], RKT: ['Raikot Bridge', 3800], GLT: ['Gilgit', 4900],
  KRM: ['Karimabad, Hunza', 8000], SKD: ['Skardu', 7310], QTA: ['Quetta', 5500], DGK: ['Dera Ghazi Khan', 400], DIK: ['Dera Ismail Khan', 570], GWD: ['Gwadar', 30], MZD: ['Muzaffarabad', 2420],
  MRE: ['Murree', 7500], KEL: ['Kel, Neelum', 6900], CKD: ['Chakdara', 2300], DIR: ['Dir', 4600], CTR: ['Chitral', 4900], KHP: ['Khaplu', 8500], ORM: ['Ormara', 30], PSU: ['Passu', 8200], ZRT: ['Ziarat', 8200], KML: ['Kund Malir', 30], MJD: ['Mohenjo-daro', 150], MJB: ['Malam Jabba', 8700], LRL: ['Loralai', 4700], KZD: ['Khuzdar', 4000],
  ABT: ['Abbottabad', 4120], KWI: ['Kiwai', 5500], SHG: ['Shogran', 7750], NTG: ['Nathia Gali', 8200], AST: ['Astore', 8500], NLT: ['Naltar', 9500], PHD: ['Phander', 9500], MSJ: ['Mastuj', 7600], SST: ['Sost', 9200], KJB: ['Khunjerab Pass', 15397], BMB: ['Bumburet', 6400], THL: ['Thal, Upper Dir', 7000], KMT: ['Kumrat', 7550], ZHB: ['Zhob', 4700], MTH: ['Mithi', 90], BWP: ['Bahawalpur', 380], TBT: ['Turbat', 420] };
export const ROAD_NOTE: Record<string, string> = { 'Babusar Pass': 'Crosses Babusar Top at 13,690 ft. Usually open from mid-June to October; snow closes it the rest of the year.', 'Skardu Road': 'Narrow cliff road along the Indus. Drive in daylight.', 'KKH': 'Karakoram Highway along the Indus gorge.', 'N-95 Swat valley': 'Slow valley road above Bahrain.' };
export const STOP_HOTELS: Record<string, Hotel[]> = {
  NRN: [['Pine Park Hotel Naran', 'Standard', 'Riverside, Kunhar valley'], ['PTDC Motel Naran', 'Backpacker', 'Basic rooms, central bazaar'], ['Arcadian Riverside Naran', 'Premium', 'River-facing rooms']],
  CHL: [['Shangrila Midway House Chilas', 'Standard', 'On the KKH, secure parking'], ['Chilas Inn', 'Backpacker', 'Budget rooms'], ['Panorama Hotel Chilas', 'Premium', 'Indus views']],
  BSM: [['PTDC Motel Besham', 'Standard', 'Above the Indus'], ['Besham Continental Hotel', 'Backpacker', 'On the KKH']],
  MNS: [['Hotel Mount View Mansehra', 'Standard', 'Town centre']],
  ISB: [['Islamabad Serena Hotel', 'Premium', 'Blue Area'], ['Envoy Continental Islamabad', 'Standard', 'Blue Area'], ['Hotel One Islamabad', 'Backpacker', 'Near the motorway']],
  MUL: [['Ramada by Wyndham Multan', 'Premium', 'Cantt'], ['Hotel One Multan', 'Standard', 'Near the M-4']],
  SKR: [['Inter Pak Inn Sukkur', 'Standard', 'Near the barrage'], ['Hotel One Sukkur', 'Backpacker', 'City centre']],
  FSD: [['Serena Hotel Faisalabad', 'Premium', 'Club Road'], ['Hotel One Faisalabad', 'Standard', 'Near the M-4']],
  LHR: [['Pearl Continental Lahore', 'Premium', 'The Mall'], ['Hotel One Lahore', 'Standard', 'Gulberg']],
  GLT: [['Gilgit Serena Hotel', 'Premium', 'Jutial, Rakaposhi view'], ['PTDC Gilgit', 'Standard', 'Chinar Bagh'], ['Madina Hotel Gilgit', 'Backpacker', 'Traveller favourite']],
  MGR: [['Swat Serena Hotel', 'Premium', 'Saidu Sharif'], ['Hotel Rock City Swat', 'Standard', 'Fizagat']],
  PSH: [['Pearl Continental Peshawar', 'Premium', 'Khyber Road']] };
export const BASE_EDGE_STOPS: Record<string, EdgeStop[]> = {
  'LHR-ISB': [[185, 'food', 'Bhera service area', 'Fuel and clean washrooms'], [245, 'view', 'Kallar Kahar', 'Salt Range views and pakoras']],
  'FSD-ISB': [[75, 'tea', 'Pindi Bhattian interchange', 'Tea and fuel'], [145, 'food', 'Bhera service area', 'Fuel and clean washrooms'], [195, 'view', 'Kallar Kahar', 'Salt Range views']],
  'MUL-FSD': [[100, 'food', 'Abdul Hakeem service area', 'Fuel and washrooms']], 'MUL-LHR': [[165, 'food', 'Motorway service area', 'Fuel and washrooms']], 'FSD-LHR': [[90, 'tea', 'M-3 service area', 'Tea and fuel']],
  'SKR-MUL': [[200, 'food', 'M-5 service area', 'Fuel and washrooms'], [300, 'view', 'Uch Sharif turn-off', 'Shrines of Uch, 15 min detour']],
  'KHI-HYD': [[85, 'tea', 'Nooriabad service area', 'Tea, fuel and washrooms']], 'HYD-SKR': [[175, 'food', 'Moro', 'Highway dhabas and fuel'], [320, 'tea', 'Rohri', 'Tea before the Indus bridge']],
  'ISB-PSH': [[75, 'food', 'Chach service area', 'Fuel and washrooms']], 'PSH-MGR': [[115, 'food', 'Chakdara', 'Fuel before the valley']], 'ISB-MGR': [[205, 'food', 'Chakdara', 'Fuel before the valley']],
  'ISB-CKD': [[75, 'tea', 'Chach service area', 'Tea and fuel']],
  'MGR-KLM': [[55, 'view', 'Madyan', 'Swat river views, walnut and honey sellers'], [65, 'food', 'Bahrain', 'River trout by the Swat river']],
  'ISB-ABT': [[85, 'tea', 'Havelian service area', 'Tea and fuel']], 'ABT-MNS': [[30, 'fuel', 'Mansehra', 'Last big fuel stop and ATMs']],
  'MNS-KWI': [[38, 'tea', 'Balakot', 'Tea and chapli kebab'], [58, 'food', 'Kiwai waterfall', 'Trout and pakoras by the waterfall']], 'KWI-NRN': [[35, 'fuel', 'Kaghan town', 'Fuel top-up']], 'ABT-NTG': [[20, 'view', 'Thandiani turn-off', 'Pine views']], 'GLT-PHD': [[100, 'view', 'Khalti Lake, Gupis', 'Lake by the Ghizer river']], 'SST-KJB': [[40, 'view', 'Khunjerab National Park gate', 'Marco Polo sheep country']],
  'NRN-CHL': [[48, 'view', 'Lulusar Lake', 'Photo stop at 11,000 ft'], [70, 'tea', 'Babusar Top', 'Tea at 13,690 ft. Windy and cold, carry a jacket'], [112, 'food', 'Chilas', 'Fuel on the KKH']],
  'MNS-BSM': [[95, 'tea', 'Thakot', 'Tea by the Indus bridge']], 'BSM-CHL': [[75, 'food', 'Dasu', 'Fuel and washrooms'], [150, 'view', 'Shatial', 'Ancient rock carvings by the road']],
  'CHL-RKT': [[40, 'view', 'Nanga Parbat viewpoint', 'Clear-day views of the 26,660 ft peak']],
  'RKT-GLT': [[40, 'view', 'Junction of Three Mountains', 'Himalaya, Karakoram and Hindu Kush meet'], [83, 'food', 'Gilgit', 'Fuel and ATMs']],
  'GLT-KRM': [[60, 'tea', 'Rakaposhi View Point, Ghulmet', 'Tea facing 25,550 ft Rakaposhi']],
  'RKT-SKD': [[35, 'view', 'Alam Bridge', 'Gilgit and Indus rivers meet'], [110, 'tea', 'Roundu valley', 'Tea stalls along the Indus']],
  'GLT-SKD': [[25, 'view', 'Alam Bridge', 'Gilgit and Indus rivers meet'], [115, 'tea', 'Roundu valley', 'Tea stalls along the Indus']],
  'KRM-PSU': [[20, 'view', 'Attabad Lake', 'Turquoise lake and tunnels']], 'SKD-KHP': [[1, 'food', 'Skardu', 'Lunch, fuel and ATMs before Khaplu'], [48, 'view', 'Keris', 'Wooden bridge over the river, orchards and tall peaks'], [65, 'tea', 'Ghowari', 'Tall golden poplars in autumn, 1 h before Khaplu'], [94, 'view', 'Barah Valley', 'Water ponds and apricot orchards']],
  'MRE-MZD': [[40, 'tea', 'Kohala bridge', 'Tea by the Jhelum river']], 'MZD-KEL': [[93, 'view', 'Keran', 'Neelum river views'], [136, 'food', 'Sharda', 'By the Neelum river']],
  'DIR-CTR': [[30, 'view', 'Lowari Tunnel', '8.5 km tunnel under the pass'], [75, 'tea', 'Drosh', 'Tea stop']],
  'QTA-SKR': [[160, 'food', 'Sibi', 'Fuel and washrooms']], 'KZD-KHI': [[220, 'tea', 'Bela', 'Tea stop']], 'DGK-LRL': [[85, 'view', 'Fort Munro', 'Hill station views at 6,470 ft']], 'DIK-ISB': [[165, 'tea', 'M-14 service area', 'Tea and fuel']],
  'KHI-KML': [[125, 'food', 'Zero Point, Makran Coastal Highway', 'Last dhabas and fuel before the coast']], 'KML-ORM': [[40, 'view', 'Princess of Hope', 'Rock formation by the highway']], 'ORM-GWD': [[1, 'food', 'Ormara', 'Lunch and fuel by the sea, or stay the night: Hammerhead and the turtle beach']] };
export const STOP_KIND: Record<StopKind, [string, string, number]> = { drive: ['ph-car-simple', 'var(--mute)', 0], food: ['ph-fork-knife', 'var(--cor)', .75], tea: ['ph-coffee', 'var(--amb)', .33], view: ['ph-binoculars', 'var(--sky)', .25], fuel: ['ph-gas-pump', 'var(--vio)', .17], go: ['ph-flag', 'var(--g)', 0], bed: ['ph-bed', 'var(--g)', 0], pin: ['ph-map-pin', 'var(--vio)', 0], plane: ['ph-airplane-tilt', 'var(--sky)', 0] };
export const SLOTS: string[] = ['Morning', 'Midday', 'Afternoon', 'Evening'];
export const MON: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_FULL: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const SUNSET: number[] = [17.4, 17.9, 18.3, 18.6, 19.0, 19.3, 19.3, 19.0, 18.4, 17.8, 17.2, 17.1];
export const SUNRISE: number[] = [7.1, 6.9, 6.3, 5.7, 5.2, 5.0, 5.1, 5.4, 5.8, 6.2, 6.6, 7.0];
export const STOP_DUR: Partial<Record<StopKind, number>> = { food: 40, tea: 20, view: 15, fuel: 10 };
export const MTN_NODES: Set<string> = new Set(['MGR', 'KLM', 'MNS', 'NRN', 'CHL', 'BSM', 'RKT', 'GLT', 'KRM', 'SKD', 'MZD', 'MRE', 'KEL', 'DIR', 'CTR', 'KHP', 'PSU', 'ZRT', 'MJB', 'ABT', 'KWI', 'SHG', 'NTG', 'AST', 'NLT', 'PHD', 'MSJ', 'SST', 'KJB', 'BMB', 'THL', 'KMT']);
// [a, b, road km, avg km/h, car toll one-way PKR, mountain?, road name]
export const EDGES: Edge[] = [
  ['KHI', 'HYD', 165, 95, 700, 0, 'M-9'], ['HYD', 'SKR', 330, 65, 400, 0, 'N-5'], ['SKR', 'MUL', 392, 100, 1900, 0, 'M-5'], ['MUL', 'FSD', 240, 100, 1150, 0, 'M-4'],
  ['FSD', 'ISB', 300, 100, 1300, 0, 'M-4 / M-2'], ['MUL', 'LHR', 335, 95, 1500, 0, 'M-3 / M-4'], ['LHR', 'ISB', 375, 100, 1850, 0, 'M-2'], ['FSD', 'LHR', 180, 80, 500, 0, 'M-3'],
  ['ISB', 'PSH', 180, 100, 650, 0, 'M-1'], ['PSH', 'MGR', 160, 70, 470, 0, 'Swat Motorway'], ['ISB', 'MGR', 250, 75, 900, 0, 'M-1 + Swat Motorway'], ['MGR', 'KLM', 95, 30, 0, 1, 'N-95 Swat valley'],
  ['ISB', 'ABT', 110, 75, 450, 0, 'Hazara Motorway'], ['ABT', 'MNS', 35, 40, 150, 0, 'Hazara Motorway'], ['MNS', 'KWI', 63, 35, 0, 1, 'N-15 Kaghan'], ['KWI', 'NRN', 57, 40, 0, 1, 'N-15 Kaghan'], ['KWI', 'SHG', 10, 15, 0, 1, 'Kiwai–Shogran road'], ['NRN', 'CHL', 115, 32, 0, 1, 'Babusar Pass', [6, 7, 8, 9, 10]], ['MNS', 'BSM', 120, 40, 0, 1, 'KKH'],
  ['BSM', 'CHL', 210, 40, 0, 1, 'KKH'], ['CHL', 'RKT', 50, 45, 0, 1, 'KKH'], ['RKT', 'GLT', 85, 45, 0, 1, 'KKH'], ['GLT', 'KRM', 100, 45, 0, 1, 'KKH'],
  ['RKT', 'SKD', 205, 35, 0, 1, 'Skardu Road'], ['GLT', 'SKD', 210, 35, 0, 1, 'Skardu Road'], ['QTA', 'SKR', 390, 60, 300, 0, 'N-65'], ['QTA', 'KZD', 300, 60, 200, 0, 'N-25'], ['KZD', 'KHI', 390, 65, 200, 0, 'N-25'],
  ['MUL', 'DGK', 95, 60, 0, 0, 'N-70'], ['DGK', 'LRL', 250, 45, 0, 0, 'N-70 via Fort Munro'], ['LRL', 'QTA', 185, 50, 0, 0, 'N-70'], ['LRL', 'ZRT', 150, 45, 0, 1, 'Sanjawi Road'], ['DIK', 'ISB', 330, 85, 1000, 0, 'M-14'], ['DIK', 'DGK', 230, 60, 0, 0, 'N-55'],
  ['MZD', 'MNS', 60, 40, 0, 1, 'N-15'], ['KHI', 'KML', 240, 75, 0, 0, 'Makran Coastal Hwy'], ['KML', 'ORM', 135, 70, 0, 0, 'Makran Coastal Hwy'], ['ORM', 'GWD', 255, 70, 0, 0, 'Makran Coastal Hwy'],
  ['ISB', 'MRE', 60, 40, 0, 1, 'Murree Expressway'], ['MRE', 'MZD', 80, 40, 0, 1, 'Murree–Kohala Road'], ['MZD', 'KEL', 155, 28, 0, 1, 'Neelum Road'], ['ISB', 'CKD', 210, 85, 900, 0, 'M-1 + Swat Motorway'], ['PSH', 'CKD', 125, 70, 470, 0, 'Swat Motorway'],
  ['CKD', 'MGR', 45, 40, 0, 1, 'N-95'], ['CKD', 'DIR', 85, 45, 0, 1, 'N-45'], ['DIR', 'CTR', 120, 35, 0, 1, 'Lowari Tunnel road'], ['MGR', 'MJB', 40, 30, 0, 1, 'Malam Jabba Road'], ['SKD', 'KHP', 103, 36, 0, 1, 'Khaplu Road'],
  ['KRM', 'PSU', 55, 45, 0, 1, 'KKH'], ['QTA', 'ZRT', 125, 45, 0, 1, 'Ziarat Road'], ['SKR', 'MJD', 90, 55, 0, 0, 'Larkana Road'],
  ['ABT', 'NTG', 35, 30, 0, 1, 'Abbottabad–Nathia Gali Road'], ['MRE', 'NTG', 35, 30, 0, 1, 'Murree–Nathia Gali Road'],
  ['RKT', 'AST', 50, 28, 0, 1, 'Astore Road'], ['AST', 'SKD', 170, 20, 0, 1, 'Deosai road (Jun–Sep)', [6, 7, 8, 9]], ['GLT', 'NLT', 40, 20, 0, 1, 'Naltar jeep road'],
  ['GLT', 'PHD', 165, 35, 0, 1, 'Gilgit–Ghizer Road'], ['PHD', 'MSJ', 100, 25, 0, 1, 'Shandur Pass (Jun–Sep)', [6, 7, 8, 9]], ['MSJ', 'CTR', 110, 30, 0, 1, 'Chitral–Mastuj Road'],
  ['PSU', 'SST', 35, 45, 0, 1, 'KKH'], ['SST', 'KJB', 85, 40, 0, 1, 'KKH to Khunjerab (Apr–Nov)', [4, 5, 6, 7, 8, 9, 10, 11]], ['CTR', 'BMB', 40, 20, 0, 1, 'Ayun–Bumburet Road'],
  ['DIR', 'THL', 100, 30, 0, 1, 'Dir–Kalkot–Thal Road'], ['THL', 'KMT', 20, 15, 0, 1, 'Kumrat jeep track'],
  ['QTA', 'ZHB', 330, 50, 0, 0, 'N-50'], ['ZHB', 'DIK', 210, 50, 0, 0, 'N-50'], ['SKR', 'DGK', 390, 60, 0, 0, 'N-55 Indus Highway'], ['DIK', 'PSH', 300, 65, 300, 0, 'N-55 via Kohat'],
  ['HYD', 'MTH', 230, 60, 0, 0, 'Hyderabad–Mithi Road'], ['MUL', 'BWP', 100, 80, 0, 0, 'N-5'], ['GWD', 'TBT', 170, 70, 0, 0, 'M-8']];
export const DIESEL = 395, LOCAL_CAR = 15000;
/** Prices the engine reads at run time. The admin price list (src/prices.ts) overwrites these. */
export const P = { petrol: PETROL, diesel: DIESEL, localCar: LOCAL_CAR, coachFlat: 6.5, coachMtn: 9, airportCoach: 6.5, raikotJeep: 10000 };
export const AIRPORTS: Record<string, [string, number, number]> = { ISB: ['Islamabad', 33.56, 72.85], LHR: ['Lahore', 31.52, 74.40], KHI: ['Karachi', 24.90, 67.17] };
export const FARES: Record<string, Record<string, number>> = { Skardu: { ISB: 22000, LHR: 30000, KHI: 38000 }, Gilgit: { ISB: 20000, LHR: 32000, KHI: 42000 }, Chitral: { ISB: 18000 }, Gwadar: { KHI: 18000, ISB: 32000, LHR: 32000 },
  Karachi: { ISB: 24000, LHR: 22000 }, Lahore: { KHI: 22000 }, Islamabad: { KHI: 24000 }, Quetta: { KHI: 20000, ISB: 26000, LHR: 26000 }, Peshawar: { KHI: 26000 }, Multan: { KHI: 20000 } };
export const BASE_DESTS: DestInput[] = [
  { id: 'hunza', name: 'Hunza', town: 'Karimabad, Hunza', region: 'Gilgit-Baltistan', lat: 36.32, lon: 74.66, ft: 8000, node: 'KRM', air: 'Gilgit', airNote: 'Gilgit → Karimabad by car, 100 km, about 2.5 h', best: R(4, 10), warn: [R(12, 2), 'Very cold in winter. Many hotels close and Khunjerab Pass is shut.'], terrain: { seed: 3.1, amp: 10, rise: 2.6, wig: 1 },
    hotels: [['Eagle’s Nest Hotel Duikar', 'Standard', 'Sunrise over Rakaposhi and Ultar'], ['Hunza Embassy Hotel', 'Backpacker', 'Walk to Baltit Fort'], ['Luxus Hunza', 'Premium', 'On Attabad Lake']],
    places: [['Baltit Fort', 'Karimabad · 10 min walk', '700-year-old fort above the town'], ['Altit Fort & Royal Garden', '3 km', 'Oldest fort in the valley'], ['Eagle’s Nest, Duikar', '20 min drive', 'Sunrise over Rakaposhi and Ultar'], ['Attabad Lake', '25 km · 40 min', 'Turquoise lake, boating'], ['Passu Cones viewpoint', '50 km · 1.25 h', 'The cathedral peaks, seen from the KKH at Passu'], ['Khunjerab Pass', '150 km · 3 h', 'China border at 15,397 ft. Carry your CNIC', R(4, 11)], ['Hoper Glacier, Nagar', '1 h', 'Short walk to the glacier view']],
    eat: 'Chapshuro and walnut cake at Karimabad cafés', jeeps: [['khunjerab', 'Khunjerab Pass day trip', 'Up to 15,397 ft · full day', 18000, R(4, 11)], ['hopper', 'Hoper Glacier, Nagar', 'Half day, return', 7000]] },
  { id: 'skardu', name: 'Skardu', town: 'Skardu', region: 'Gilgit-Baltistan', lat: 35.30, lon: 75.63, ft: 7310, node: 'SKD', air: 'Skardu', airNote: 'Airport → town, 20 min', best: R(4, 11), warn: [R(12, 2), 'Freezing winter. Deosai and Basho are closed.'], terrain: { seed: 11.2, amp: 8.5, rise: 2.3, wig: .7 },
    hotels: [['Shangrila Resort Skardu', 'Premium', 'Lower Kachura Lake'], ['Mashabrum Hotel Skardu', 'Standard', 'Airport road'], ['Indus Motel Skardu', 'Backpacker', 'Indus riverfront']],
    places: [['Upper Kachura Lake', '30 km · 45 min', 'Clear lake, short walk down'], ['Shangrila, Lower Kachura', '25 km', 'Heart-shaped lake and resort'], ['Sarfaranga Cold Desert', '20 km · 30 min', 'Sand dunes at 7,500 ft, best early morning or before sunset'], ['Shigar Fort', '32 km · 45 min', 'Restored 17th-century palace'], ['Soq Valley', 'With the Kachura lakes', 'Quiet green valley with orchards and streams'], ['Satpara Lake', '8 km', 'Lake above the town'], ['Kharpocho Fort', 'In Skardu town · short climb', 'Hilltop fort above the town and the Indus'], ['Deosai Plains', 'By jeep · 13,500 ft', 'High plateau of wildflowers', R(6, 9)], ['Manthokha Waterfall', '75 km · 2 h', 'Tall falls in Kharmang'], ['Khamosh Waterfall', 'Near Manthokha', 'Quiet falls, usually seen with Manthokha', R(5, 9)], ['Blind Lake', '45 km · 1 h 40 min, past Shigar', 'Still green lake, 19 km (about 50 min) beyond Shigar'], ['Basho Valley', 'By jeep or 4x4 · 40 km', 'Pine forest, meadows and streams, best June to September', R(6, 9)], ['Katpana Cold Desert', '10 km · 20 min', 'White sand dunes by the airport, best early morning or before sunset'], ['Keris, Ghowari, Barah and Khaplu', '103 km · 3 h', 'On the way: Keris’ wooden bridge, Ghowari’s golden poplars, Barah Valley, then Khaplu Palace']],
    days: [
      { places: ['Upper Kachura Lake', 'Shangrila, Lower Kachura', 'Soq Valley'], note: 'Soq Valley is seen on the same visit as the Kachura lakes.' },
      { places: ['Shigar Fort', 'Blind Lake'] },
      { places: ['Manthokha Waterfall', 'Khamosh Waterfall', 'Sarfaranga Cold Desert'], note: 'Back by Sarfaranga desert before sunset, then Skardu.' },
      { places: ['Satpara Lake', 'Kharpocho Fort', 'Katpana Cold Desert'], note: 'Katpana desert is usually done with Kharpocho Fort. Deserts are best early morning or before sunset.' },
      { places: ['Deosai Plains'] },
      { places: ['Keris, Ghowari, Barah and Khaplu'], note: 'A long day there and back. Or stay a night in Khaplu and see more.', stay: 'khaplu' }
    ],
    eat: 'Balti food, apricot dishes, trout at Kachura', jeeps: [['deosai', 'Deosai Plains', '13,500 ft · full day', 18000, R(6, 9)], ['shigar', 'Shigar Fort & cold desert', 'Half day', 7000], ['basho', 'Basho Valley', 'By jeep or 4x4 · half day', 9000, R(6, 9)]] },
  { id: 'naran', name: 'Naran', town: 'Naran', region: 'Kaghan valley, KP', lat: 34.91, lon: 73.65, ft: 7900, node: 'NRN', best: R(5, 9), warn: [R(12, 4), 'Snow usually closes the road beyond Kaghan from December to April.'], hotels: STOP_HOTELS.NRN,
    places: [['Lake Saif-ul-Malook', '10 km · 1 h by jeep', 'Lake under Malika Parbat at 10,580 ft', R(6, 9)], ['Lalazar meadows', '21 km by jeep', 'Pine meadows above Battakundi', R(6, 9)], ['Lulusar Lake', '48 km · 1.5 h', 'Source of the Kunhar river', R(6, 10)], ['Babusar Top', '70 km · 2.5 h', 'Views from the 13,690 ft pass', R(6, 10)], ['Naran bazaar & riverside', 'Walk', 'Trout grills along the Kunhar']],
    eat: 'River trout and chapli kebab', jeeps: [['saif', 'Lake Saif-ul-Malook', 'Return with waiting time', 5000, R(6, 9)], ['lalazar', 'Lalazar meadows', 'Half day', 6000, R(6, 9)]] },
  { id: 'kalam', name: 'Kalam', town: 'Kalam, Swat', region: 'Swat, KP', lat: 35.49, lon: 72.58, ft: 6560, node: 'KLM', best: R(5, 9), warn: [R(12, 3), 'Snow often blocks the road above Bahrain in winter.'], terrain: { seed: 7.4, amp: 6.5, rise: 2, wig: -1.2 },
    hotels: [['Walnut Heights Kalam', 'Premium', 'Riverside cabins'], ['Kalam Hotel Swat', 'Standard', 'Main bazaar'], ['Ushu Forest Camp', 'Backpacker', 'Tents in the pines']],
    places: [['Ushu Forest', '8 km · 20 min', 'Pine forest by the river'], ['Mahodand Lake', '35 km · 2 h by jeep', 'Lake of fish at 9,400 ft', R(6, 10)], ['Kalam bazaar & riverside', 'Walk', 'Trout, dry fruit and shawls'], ['Matiltan & Falak Sar view', '12 km', 'Glacier peaks above Kalam']],
    eat: 'River trout and Swati pulao', jeeps: [['mahodand', 'Mahodand Lake', '2 h each way, return', 8000, R(6, 10)], ['ushu', 'Ushu Forest & Matiltan', 'Half day', 5000]] },
  { id: 'fairy', name: 'Fairy Meadows', town: 'Fairy Meadows', region: 'Diamer, GB', lat: 35.39, lon: 74.59, ft: 10830, node: 'RKT', hub: .66, air: 'Gilgit', airNote: 'Gilgit → Raikot Bridge by car, 85 km, 2 h, then jeep and hike', best: R(5, 10), warn: [R(11, 4), 'Camps close and the jeep track is snowbound from November to April.'], terrain: { seed: 5.5, amp: 12, rise: 4.2, wig: 1.3 },
    hotels: [['Raikot Sarai Fairy Meadows', 'Standard', 'Nanga Parbat view'], ['Fairy Meadows Cottages', 'Backpacker', 'Log huts, shared baths']],
    places: [['Nanga Parbat at sunrise', 'At camp', 'The mountain fills the skyline'], ['Reflection Lake', '30 min walk', 'Nanga Parbat mirrored in the water'], ['Beyal Camp', '2 h hike', 'Pine meadows and wooden huts'], ['Nanga Parbat Base Camp', '5–6 h return from Beyal', 'Glacier views. Start early', R(6, 9)]],
    eat: 'Simple camp meals. Carry snacks' },
  { id: 'neelum', name: 'Neelum Valley', town: 'Kel, Neelum', region: 'Azad Kashmir', lat: 34.82, lon: 74.35, ft: 6900, node: 'KEL', best: R(4, 10), warn: [R(12, 2), 'Snow closes roads beyond Sharda in winter.'],
    places: [['Keran', 'On the way in', 'Neelum river views'], ['Sharda', 'On the way in', 'Ruins of the ancient Sharda temple'], ['Arang Kel', 'Chairlift + 45 min hike', 'Meadow village at 8,400 ft'], ['Ratti Gali Lake', 'By jeep from Dowarian', 'Alpine lake at 12,100 ft', R(7, 9)]],
    eat: 'Kashmiri chai and river trout', jeeps: [['ratti', 'Ratti Gali Lake', 'Dowarian ⇄ base, full day', 15000, R(7, 9)]] },
  { id: 'chitral', name: 'Chitral', town: 'Chitral', region: 'Khyber Pakhtunkhwa', lat: 35.85, lon: 71.79, ft: 4900, node: 'CTR', air: 'Chitral', airNote: 'Airport → town, 15 min', best: R(4, 10), warn: [R(12, 2), 'Cold winter. Lowari Tunnel stays open but roads can be icy.'],
    hotels: [['Hindukush Heights Chitral', 'Premium', 'Hillside hotel above the town'], ['PTDC Motel Chitral', 'Standard', 'Near the fort']],
    places: [['Chitral Fort & Shahi Masjid', 'Town centre', 'Royal fort by the river'], ['Bumburet, Kalash valley', '40 km · 2 h', 'Kalash villages and museum'], ['Garam Chashma hot springs', '45 km · 1.5 h', 'Natural hot spring baths'], ['Tirich Mir view', 'From town', '25,289 ft peak on clear mornings']],
    eat: 'Chitrali bread and walnut dishes', jeeps: [['kalash', 'Kalash valleys day trip', 'Bumburet and Rumbur', 9000]] },
  { id: 'khaplu', name: 'Khaplu', town: 'Khaplu', region: 'Gilgit-Baltistan', lat: 35.15, lon: 76.33, ft: 8500, node: 'KHP', air: 'Skardu', airNote: 'Skardu → Khaplu by car, 103 km, about 3 h', best: R(4, 11), warn: [R(12, 2), 'Freezing winter nights.'],
    hotels: [['Serena Khaplu Palace', 'Premium', 'Restored royal palace']],
    places: [['Machlu', '40 min past Khaplu', 'Apricot orchards and a different autumn along the upper Shyok', R(4, 11)], ['Khaplu Palace', 'In town', 'Restored 19th-century palace'], ['Chaqchan Mosque', 'In town', '14th-century wooden mosque'], ['Saling', 'Across the Shyok bridge', 'Village just opposite Khaplu, orchards and river views'], ['Thoqsikhar', 'Short walk', 'Old royal fort site'], ['Ghowari', 'On the Skardu road, 38 km · 1 h before Khaplu', 'Tall pines and poplars, golden in late October', R(10, 11)], ['Barah Valley', 'On the Skardu road, just before Khaplu', 'Clear water ponds and streams, apricot blossom in April']],
    eat: 'Balti food and apricot soups' },
  { id: 'passu', name: 'Passu', town: 'Passu', region: 'Gojal, GB', lat: 36.47, lon: 74.89, ft: 8200, node: 'PSU', air: 'Gilgit', airNote: 'Gilgit → Passu by car, 155 km, about 4 h', best: R(4, 10), warn: [R(12, 2), 'Very cold. Most guesthouses close.'],
    places: [['Passu Cones', 'At Passu', 'Cathedral peaks over the village'], ['Hussaini Suspension Bridge', '10 km', 'Rope bridge over the Hunza river'], ['Borith Lake', '4 km', 'Quiet lake near Hussaini'], ['Khunjerab Pass', '85 km · 2 h', 'China border at 15,397 ft', R(4, 11)]],
    eat: 'Gojali food and apricot cake' },
  { id: 'shogran', name: 'Shogran', town: 'Shogran', region: 'Kaghan valley, KP', lat: 34.64, lon: 73.46, ft: 7750, node: 'SHG', best: R(4, 10), warn: [R(12, 2), 'Heavy snow. The road up from Kiwai can close.'],
    places: [['Siri Paye meadows', '10 km by jeep · 1 h', 'Meadows at 9,800 ft with Makra peak views', R(5, 10)], ['Kiwai waterfall', '7 km · 18 min by road', 'Waterfall by the road at Kiwai, with trout and pakoras'], ['Shogran forest walks', 'Walk', 'Pine trails around the plateau']],
    eat: 'Trout and pakoras at Kiwai', jeeps: [['siri', 'Siri Paye meadows', 'Shogran ⇄ Siri Paye, return', 4000, R(5, 10)]] },
  { id: 'malam', name: 'Malam Jabba', town: 'Malam Jabba', region: 'Swat, KP', lat: 34.80, lon: 72.57, ft: 8700, node: 'MJB', best: [12, 1, 2, ...R(5, 9)],
    hotels: [['Pearl Continental Malam Jabba', 'Premium', 'Ski resort hotel']],
    places: [['Ski slopes', 'At the resort', 'Skiing December to February', [12, 1, 2]], ['Chairlift & zipline', 'At the resort', 'Valley views'], ['Mingora & Swat Museum', '40 km · 1 h', 'Gandhara collection'], ['Marghazar White Palace', '50 km', 'Former royal summer palace']],
    eat: 'Swati pulao and trout' },
  { id: 'kumrat', name: 'Kumrat Valley', town: 'Kumrat', region: 'Upper Dir, KP', lat: 35.53, lon: 72.22, ft: 7550, node: 'KMT', best: R(6, 9), warn: [R(11, 4), 'Snowbound from November to April.'],
    places: [['Kumrat forest', 'Thal → 1 h by jeep', 'Deodar forest by the Panjkora river'], ['Kala Chashma', 'By jeep', 'Black spring at the valley head'], ['Jahaz Banda', 'Trek, 4–5 h', 'High meadow at 10,500 ft', R(6, 9)], ['Thal wooden mosque', 'Thal village', 'Carved wooden mosque']],
    eat: 'Trout and simple camp meals', jeeps: [['kumratj', 'Thal ⇄ Kumrat forest', 'Full day, return', 10000]] },
  { id: 'kalash', name: 'Kalash Valleys', town: 'Bumburet', region: 'Chitral, KP', lat: 35.73, lon: 71.73, ft: 6400, node: 'BMB', air: 'Chitral', airNote: 'Chitral → Bumburet by jeep, 40 km, about 2 h', best: R(5, 10), warn: [R(12, 2), 'Snow on the valley road. Guesthouses mostly close.'],
    places: [['Bumburet village', 'In the valley', 'Kalash homes, walnut orchards and the river'], ['Kalasha Dur museum', 'Bumburet', 'Kalash culture and crafts'], ['Rumbur valley', '1 h by jeep', 'Quieter Kalash villages'], ['Chilam Joshi festival', 'Mid-May', 'Spring festival with dance and song', [5]]],
    eat: 'Walnut bread, cheese and local apricots', jeeps: [['rumbur', 'Rumbur valley', 'Half day, return', 6000]] },
  { id: 'rama', name: 'Astore & Rama Meadows', town: 'Astore', region: 'Gilgit-Baltistan', lat: 35.37, lon: 74.86, ft: 8500, node: 'AST', best: R(6, 9), warn: [R(11, 4), 'Snowbound. Rama and Deosai are closed.'],
    places: [['Rama Meadows', '11 km by jeep', 'Pine meadows under Nanga Parbat', R(6, 10)], ['Rama Lake', '1 h hike from Rama', 'Glacial lake', R(7, 9)], ['Astore bazaar', 'In town', 'Valley town and food'], ['Deosai Plains via Chilam', 'By jeep', 'High plateau at 13,500 ft', R(6, 9)]],
    eat: 'Simple local food and trout', jeeps: [['ramaj', 'Rama Meadows', 'Astore ⇄ Rama, return', 5000, R(6, 10)], ['deosaiA', 'Deosai Plains', 'Full day from Astore', 18000, R(6, 9)]] },
  { id: 'naltar', name: 'Naltar Valley', town: 'Naltar', region: 'Gilgit-Baltistan', lat: 36.16, lon: 74.18, ft: 9500, node: 'NLT', air: 'Gilgit', airNote: 'Gilgit → Naltar by jeep, 40 km, about 2 h', best: [...R(6, 10), 1, 2], warn: [R(11, 4), 'The jeep road can close after heavy snow.'],
    places: [['Naltar lakes (Satrangi, Bodlok)', '12 km by jeep', 'Coloured lakes in pine forest', R(6, 10)], ['Naltar pine forest', 'Walk', 'Forest trails above the village'], ['Naltar ski slope', 'In the valley', 'Skiing in winter', [12, 1, 2]]],
    eat: 'Local food at guesthouses', jeeps: [['naltarj', 'Naltar lakes', 'Satrangi & Bodlok lakes, return', 9000, R(6, 10)]] },
  { id: 'phander', name: 'Phander & Ghizer', town: 'Phander', region: 'Ghizer, GB', lat: 36.16, lon: 72.94, ft: 9500, node: 'PHD', air: 'Gilgit', airNote: 'Gilgit → Phander by car, 165 km, about 5 h', best: R(5, 10), warn: [R(12, 3), 'Very cold; many guesthouses close.'],
    places: [['Phander Lake', 'In the valley', 'Clear blue lake by the road'], ['Khalti Lake, Gupis', 'On the way', 'Lake by the Ghizer river'], ['Shandur Pass', '2 h by jeep', 'Highest polo ground at 12,200 ft', R(6, 9)]],
    eat: 'Trout from Phander Lake', jeeps: [['shandurj', 'Shandur Pass', 'Full day from Phander', 15000, R(6, 9)]] },
  { id: 'murree', name: 'Murree', town: 'Murree', region: 'Punjab', lat: 33.91, lon: 73.39, ft: 7500, node: 'MRE', best: [...R(3, 10), 12, 1], warn: [R(12, 2), 'Snowfall brings traffic jams. Check the snow advisory and avoid weekends.'],
    hotels: [['Pearl Continental Bhurban', 'Premium', 'Bhurban, forest and golf views']],
    places: [['Mall Road', 'Town centre', 'Shops, food and the GPO'], ['Pindi Point', '2 km', 'Chairlift views'], ['Patriata chairlift', '15 km', 'Cable car and chairlift'], ['Kashmir Point', 'Walk', 'Forest walks and views']],
    eat: 'Chapli kebab and roasted corn on Mall Road' },
  { id: 'nathia', name: 'Nathia Gali', town: 'Nathia Gali', region: 'Galiyat, KP', lat: 34.07, lon: 73.38, ft: 8200, node: 'NTG', best: R(4, 10), warn: [R(12, 2), 'Snow and icy roads.'],
    places: [['Mushkpuri Top', '4 km hike', 'Highest point in the Galiyat'], ['Pipeline Track', '4 km walk', 'Flat forest trail to Dunga Gali'], ['Miranjani', 'Hike', 'Galiyat views'], ['Ayubia chairlift', '10 km', 'Chairlift and forest']],
    eat: 'Tea and pakoras at the bazaar' },
  { id: 'ziarat', name: 'Ziarat', town: 'Ziarat', region: 'Balochistan', lat: 30.38, lon: 67.73, ft: 8200, node: 'ZRT', best: R(4, 10), warn: [R(12, 2), 'Snow and freezing nights.'],
    hotels: [['PTDC Motel Ziarat', 'Standard', 'Near the Residency']],
    places: [['Quaid-e-Azam Residency', 'Town', 'Where Jinnah spent his last days'], ['Juniper forest', 'Around town', 'One of the oldest juniper forests'], ['Prospect Point', '6 km', 'Valley viewpoint']],
    eat: 'Sajji and Balochi food' },
  { id: 'gwadar', name: 'Gwadar', town: 'Gwadar', region: 'Balochistan', lat: 25.13, lon: 62.32, ft: 30, node: 'GWD', icon: 'ph-waves', air: 'Gwadar', airNote: 'Airport → town, 20 min', best: R(10, 3), warn: [R(5, 8), 'Hot and humid in summer.'],
    hotels: [['Pearl Continental Gwadar', 'Premium', 'On Koh-e-Batil']],
    places: [['Koh-e-Batil (Hammerhead)', 'Town', 'Clifftop views over both bays'], ['Marine Drive', 'Town', 'Sea front'], ['Ormara beach', 'On the way', 'Quiet beach town']],
    eat: 'Fresh fish and prawns' },
  { id: 'kundmalir', name: 'Kund Malir', town: 'Kund Malir', region: 'Hingol, Balochistan', lat: 25.40, lon: 65.47, ft: 30, node: 'KML', icon: 'ph-waves', best: R(10, 3), warn: [R(5, 9), 'Very hot. Little shade on the coast.'],
    places: [['Kund Malir beach', 'On arrival', 'Blue water and a wide beach'], ['Princess of Hope', '40 km west', 'Natural rock formation'], ['Hingol mud volcanoes', 'By jeep', 'Chandragup mud volcano'], ['Hinglaj Mata temple', 'Hingol', 'Cave temple and pilgrimage site']],
    eat: 'Few dhabas on the coast. Carry food and water' },
  { id: 'mohenjo', name: 'Mohenjo-daro', town: 'Mohenjo-daro', region: 'Sindh', lat: 27.33, lon: 68.14, ft: 150, node: 'MJD', icon: 'ph-bank', best: R(11, 2), warn: [R(4, 9), 'Extremely hot. Visit at sunrise.'],
    places: [['Mohenjo-daro ruins', 'On site', '4,500-year-old city of the Indus civilisation'], ['Site museum', 'On site', 'Seals, pottery and the Priest-King'], ['Larkana', '28 km', 'City stop and food']],
    eat: 'Sindhi biryani in Larkana' },
  { id: 'lahore', name: 'Lahore', town: 'Lahore', region: 'Punjab', lat: 31.55, lon: 74.34, ft: 710, node: 'LHR', icon: 'ph-buildings', air: 'Lahore', best: R(10, 3), warn: [R(5, 7), 'Very hot from May to July.'], hotels: STOP_HOTELS.LHR,
    places: [['Badshahi Mosque', 'Walled City', 'One of the largest Mughal mosques'], ['Lahore Fort & Sheesh Mahal', 'Walled City', 'Mughal fort and mirror palace'], ['Walled City food street', 'Fort Road', 'Dinner with fort views'], ['Wagah border ceremony', '28 km', 'Evening flag ceremony']],
    eat: 'Nihari, paye and Lakshmi Chowk food' },
  { id: 'islamabad', name: 'Islamabad', town: 'Islamabad', region: 'Capital', lat: 33.69, lon: 73.05, ft: 1770, node: 'ISB', icon: 'ph-buildings', air: 'Islamabad', best: R(10, 4), warn: [R(6, 7), 'Hot and humid in June and July.'], hotels: STOP_HOTELS.ISB,
    places: [['Faisal Mosque', 'E-7', 'Iconic mosque below the Margallas'], ['Daman-e-Koh', 'Margalla Hills', 'City viewpoint'], ['Pakistan Monument & museum', 'Shakarparian', 'Monument shaped like petals'], ['Margalla Trail 3', 'Sector F-6', '1–2 h hike to the ridge'], ['Lok Virsa Museum', 'Shakarparian', 'Heritage museum']],
    eat: 'Karahi and barbecue at Melody food street' },
  { id: 'karachi', name: 'Karachi', town: 'Karachi', region: 'Sindh', lat: 24.86, lon: 67.01, ft: 30, node: 'KHI', icon: 'ph-buildings', air: 'Karachi', best: R(11, 2), warn: [R(5, 8), 'Hot and humid.'],
    hotels: [['Pearl Continental Karachi', 'Premium', 'Club Road']],
    places: [['Mazar-e-Quaid', 'Central', 'Jinnah’s mausoleum'], ['Frere Hall', 'Saddar', 'Colonial hall and gardens'], ['Mohatta Palace', 'Clifton', 'Museum in a stone palace'], ['Clifton Beach & Sea View', 'Clifton', 'Sunset by the sea'], ['Burns Road food street', 'Saddar', 'Nihari, rabri and bun kebab']],
    eat: 'Burns Road nihari and Boat Basin barbecue' }];
export const CITY_AIR: Record<string, string> = { Karachi: 'Karachi', Lahore: 'Lahore', Islamabad: 'Islamabad', Rawalpindi: 'Islamabad', Quetta: 'Quetta', Peshawar: 'Peshawar', Multan: 'Multan', Gilgit: 'Gilgit', Skardu: 'Skardu', Chitral: 'Chitral', Gwadar: 'Gwadar' };
export const PROV_FT: Record<string, number> = { 'Gilgit-Baltistan': 7000, 'Azad Kashmir': 3500, 'Khyber Pakhtunkhwa': 2500, Balochistan: 2000, Punjab: 650, Sindh: 100, Capital: 1770 };

/** Places SafarCo has checked itself (pins from the owner); these win over anything imported. */
const OWN_INFO: Record<string, PlaceInfo> = {
  'shogran|Kiwai waterfall': { lat: 34.6309, lon: 73.4435, km: 7, min: 18, visit: 45, access: 'car', checked: true },
  // Past Shigar, not by Skardu: the straight line is short but the road goes round.
  'skardu|Blind Lake': { lat: 35.4216, lon: 75.6414, km: 45, min: 100, visit: 60, access: 'car', checked: true },
  'shigar|Blind Lake (Zharba Tso)': { lat: 35.4216, lon: 75.6414, km: 19, min: 50, visit: 60, access: 'car', checked: true }
};
/** "45 km · 1 h 40 min" for a checked place. */
const ownDist = (i: PlaceInfo) => i.km == null ? '' : `${i.km} km` + (i.min ? ` · ${i.min >= 60 ? `${Math.floor(i.min / 60)} h${i.min % 60 ? ` ${i.min % 60} min` : ''}` : `${i.min} min`}` : '');
export const PLACE_INFO: Record<string, PlaceInfo> = { ...IMPORTED_INFO, ...OWN_INFO };

// ---- Guides imported from the "places to check" spreadsheet (scripts/import-places.py) ----
/** Map link for a place pinned in the spreadsheet. */
const pinLink = (i?: PlaceInfo) => i?.lat != null && i?.lon != null ? `https://www.google.com/maps/search/?api=1&query=${i.lat},${i.lon}` : undefined;
function applyImport(base: DestInput[]): DestInput[] {
  const out = base.map(d => {
    const p = DEST_PATCH[d.id], ren = new Map(p?.rename || []), gone = new Set(p?.remove || []);
    const places = [...(d.places || []).filter(x => !gone.has(x[0])).map(x => (ren.has(x[0]) ? [ren.get(x[0])!, ...x.slice(1)] : x) as Place), ...(p?.add || [])]
      .map(x => x[4] || !pinLink(PLACE_INFO[`${d.id}|${x[0]}`]) ? x : [x[0], x[1], x[2], x[3] ?? null, pinLink(PLACE_INFO[`${d.id}|${x[0]}`])] as Place);
    const days = d.days ? d.days.map(x => ({ ...x, places: x.places.filter(n => !gone.has(n)).map(n => ren.get(n) || n) })) : p?.days;
    return { ...d, places, ...(days ? { days } : {}), ...(p?.best ? { best: p.best } : {}) };
  });
  const ids = new Set(base.map(d => d.id));
  const all = [...out, ...IMPORTED_DESTS.filter(d => !ids.has(d.id)).map(d => ({ ...d, ftEst: PROV_FT[d.region] ?? 2000 }))];
  // Places SafarCo checked itself: their pin (or none) and distance win over imported ones.
  return all.map(d => ({ ...d, places: (d.places || []).map(x => { const o = OWN_INFO[`${d.id}|${x[0]}`]; if (!o) return x;
    return [x[0], d.id === 'skardu' || !ownDist(o) ? x[1] : ownDist(o), x[2], x[3] ?? null, pinLink(o)] as Place; }) }));
}
/** Every destination: the app's own guides with the imported changes, then the imported ones. */
export const DESTS: DestInput[] = applyImport(BASE_DESTS);
/** Road stops, with stretches the spreadsheet changed. */
export const EDGE_STOPS: Record<string, EdgeStop[]> = { ...BASE_EDGE_STOPS, ...STOP_PATCH };
export { IMPORTED_ON };
export const SUGGEST_POOL: string[] = ['hunza', 'skardu', 'naran', 'kalam', 'fairy', 'neelum', 'chitral', 'khaplu', 'passu', 'shogran', 'malam', 'kumrat', 'murree', 'nathia', 'ziarat', 'gwadar', 'kundmalir', 'mohenjo', 'kalash', 'rama', 'naltar', 'phander'];
export const POP_DEST: string[] = ['hunza', 'skardu', 'naran', 'kalam', 'fairy', 'neelum', 'chitral', 'murree', 'khaplu', 'gwadar', 'lahore', 'karachi'];
export const CAT: Record<string, string> = { Fuel: 'var(--amb)', Transport: 'var(--sky)', Tolls: 'var(--vio)', Stay: 'var(--g)', Meals: 'var(--cor)', 'Local jeep': 'var(--sky)', Flights: 'var(--sky)', Rental: 'var(--vio)', 'To the airport': 'var(--sky)', 'Car + driver there': 'var(--vio)', 'Jeep trips': 'var(--amb)' };
export const CAT2: Record<string, string> = { Fuel: '#FF7A3D', Transport: '#3B8DFF', Tolls: '#5B6CFF', Stay: '#0FA678', Meals: '#FF4F7B', 'Local jeep': '#3B8DFF', Flights: '#3B8DFF', Rental: '#5B6CFF', 'To the airport': '#3B8DFF', 'Car + driver there': '#5B6CFF', 'Jeep trips': '#FF7A3D' };
