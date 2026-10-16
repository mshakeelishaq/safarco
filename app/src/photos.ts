// Photos by shakeelnaturegraphy (in public/photos), used on the welcome screen and as the
// summary photo for trips in the right season. For now the autumn photos are one shared mix;
// photos for each destination will come later.
import { wishPlaces } from './engine/seasons';

/** Autumn colours across Gilgit-Baltistan, for trips in October and November. */
const AUTUMN = ['/photos/autumn-hunza.webp', '/photos/hunza-autumn-peaks.webp', '/photos/hunza-orchards.webp', '/photos/hunza-autumn-valley.webp', '/photos/hunza-golden-light.webp', '/photos/altit-fort.webp'];
const AUTUMN_MONTHS = [10, 11];
/** A place's own photo, used whenever it's the trip's place: Hunza is the view of Rakaposhi. */
const OWN: Record<string, string> = {
  hunza: '/photos/autumn-hunza.webp',
  nagar: '/photos/rakaposhi-view-autumn.webp',
  gilgit: '/photos/gilgit-night.webp',
  skardu: '/photos/shangrila-autumn.webp',
  shigar: '/photos/shigar-garden-peaks.webp',
  rama: '/photos/rama-meadows-peaks.webp',
  abbottabad: '/photos/abbottabad-valley-view.webp',
  // The Indus Highway through the date palms between Shikarpur and Sukkur, on the way south to Karachi.
  sukkur: '/photos/sukkur-lansdowne-bridge.webp',
  kundmalir: '/photos/kund-malir-beach.webp',
  // Ormara, on the coast on the way: the generic sea photo is Karachi's beach.
  gwadar: '/photos/ormara-beach-evening.webp',
  hyderabad: '/photos/hyderabad-bangles.webp',
  thatta: '/photos/thatta-shah-jahan-arches.webp',
  uch: '/photos/uch-sharif-tombs.webp',
  multan: '/photos/multan-shah-rukn-e-alam.webp',
  bahawalpur: '/photos/derawar-fort.webp',
  lahore: '/photos/lahore-azadi-chowk-sunrise.webp',
  chakwal: '/photos/swaik-lake.webp'
};
/** Our photo of one place at a destination, by "destination|place name". */
export const PLACE_PHOTOS: Record<string, string> = {
  'skardu|Deosai Plains': '/photos/deosai-sheosar-horses.webp',
  'rama|Deosai Plains via Chilam': '/photos/deosai-sheosar-horses.webp',
  'abbottabad|Shimla Hill': '/photos/abbottabad-valley-view.webp',
  'thandiani|Shimla Hill': '/photos/abbottabad-valley-view.webp',
  'rama|Minimarg': '/photos/minimarg-village-valley.webp',
  'rama|Rama Meadows': '/photos/rama-meadows-peaks.webp',
  'shigar|Shigar Fort': '/photos/shigar-garden-peaks.webp',
  'skardu|Shigar Fort': '/photos/shigar-garden-peaks.webp',
  'skardu|Katpana Cold Desert': '/photos/katpana-dunes.webp',
  'skardu|Shangrila, Lower Kachura': '/photos/shangrila-autumn.webp',
  'hunza|Gulmit village': '/photos/gulmit-viewpoint-autumn.webp',
  'passu|Gulmit village': '/photos/gulmit-viewpoint-autumn.webp',
  'hunza|Baltit Fort': '/photos/baltit-fort-autumn.webp',
  'hunza|Attabad Lake': '/photos/attabad-summer-boat-ride.webp',
  'passu|Attabad Lake': '/photos/attabad-summer-boat-ride.webp',
  'hunza|Hussaini Suspension Bridge': '/photos/hussaini-bridge-summer.webp',
  'passu|Hussaini Suspension Bridge': '/photos/hussaini-bridge-summer.webp',
  'nagar|Rakaposhi View Point, Ghulmet': '/photos/rakaposhi-view-autumn.webp',
  'nagar|Hoper Glacier viewpoint': '/photos/hoper-glacier-peaks.webp',
  'hunza|Hoper Glacier, Nagar': '/photos/hoper-glacier-peaks.webp',
  'hunza|Khunjerab Pass': '/photos/khunjerab-border-gate.webp',
  'passu|Khunjerab Pass': '/photos/khunjerab-border-gate.webp',
  'khaplu|Ghowari': '/photos/ghowari-poplar-avenue.webp',
  'khaplu|Barah Valley': '/photos/barah-pond-autumn.webp',
  'naran|Lake Saif-ul-Malook': '/photos/saif-ul-malook-summer.webp',
  'naran|Babusar Top': '/photos/babusar-top-road.webp',
  'nathia|Mushkpuri Top': '/photos/mushkpuri-summer.webp',
  'skardu|Keris, Ghowari, Barah and Khaplu': '/photos/keris-bridge-autumn.webp',
  'khaplu|Khaplu Palace': '/photos/khaplu-palace-autumn.webp',
  'chakwal|Swaik Lake': '/photos/swaik-lake.webp',
  'chakwal|Kallar Kahar Lake': '/photos/kallar-kahar-lake.webp',
  'islamabad|Faisal Mosque': '/photos/faisal-mosque-dusk.webp',
  'bahawalpur|Derawar Fort': '/photos/derawar-fort.webp',
  'bahawalpur|Abbasi Mosque, Derawar': '/photos/derawar-abbasi-mosque.webp',
  'bahawalpur|Noor Mahal': '/photos/bahawalpur-noor-mahal.webp',
  'uch|Derawar Fort': '/photos/derawar-fort.webp',
  'uch|Abbasi Mosque, Derawar': '/photos/derawar-abbasi-mosque.webp',
  'multan|Shah Rukn-e-Alam shrine': '/photos/multan-shah-rukn-e-alam.webp',
  'multan|Qila Kohna Qasim Bagh': '/photos/multan-fort-aerial.webp',
  'sukkur|Lansdowne Bridge viewpoint': '/photos/sukkur-lansdowne-bridge.webp',
  'uch|Tomb of Bibi Jawindi': '/photos/uch-sharif-tombs.webp',
  'uch|Tomb of Baha’al-Halim': '/photos/uch-sharif-tombs.webp',
  'uch|Tomb of Ustad Nuriya': '/photos/uch-sharif-tombs.webp',
  'thatta|Keenjhar Lake': '/photos/keenjhar-lake.webp',
  'thatta|Shah Jahan Mosque, Thatta': '/photos/thatta-shah-jahan-arches.webp',
  'hyderabad|Shahi Bazaar': '/photos/hyderabad-bangles.webp',
  'kundmalir|Kund Malir beach': '/photos/kund-malir-beach.webp',
  'kundmalir|Golden Beach, Makran coast': '/photos/golden-beach.webp',
  'kundmalir|Princess of Hope': '/photos/princess-of-hope.webp',
  'kundmalir|Hingol mud volcanoes': '/photos/mud-volcano-hingol.webp'
};
/** Our photo of a stop on the road (by the stop's name), shown on that day of the plan. */
export const STOP_PHOTOS: Record<string, string> = { Ormara: '/photos/ormara-beach-evening.webp', Keris: '/photos/keris-bridge-autumn.webp' };
/** A photo for something in a day's plan: a road stop or one of a destination's places. */
export const photoForStop = (label: string) => STOP_PHOTOS[label] || PLACE_PHOTOS[Object.keys(PLACE_PHOTOS).find(k => k.endsWith('|' + label)) || ''];
/** More of our photos of a place, with what they show, for its guide page. */
export const GALLERY: Record<string, { src: string; caption: string }[]> = {
  islamabad: [
    { src: '/photos/faisal-mosque-dusk.webp', caption: 'Faisal Mosque at dusk, below the Margalla Hills' },
    { src: '/photos/faisal-mosque-night.webp', caption: 'Faisal Mosque lit up at night, reflected in the pool' },
    { src: '/photos/faisal-mosque-inside.webp', caption: 'Inside Faisal Mosque: the prayer hall and its great chandelier' },
    { src: '/photos/islamabad-jacaranda-path.webp', caption: 'Spring: jacaranda in bloom along a park path, usually in late April' },
    { src: '/photos/islamabad-jacaranda-road.webp', caption: 'Spring: jacaranda over an Islamabad avenue' },
    { src: '/photos/islamabad-blossom-park.webp', caption: 'Spring: white pear blossom in the parks, usually in March' },
    { src: '/photos/islamabad-blossom-walk.webp', caption: 'Spring: a morning walk under the blossom' },
    { src: '/photos/islamabad-blossom-photo.webp', caption: 'Spring: stopping to photograph the blossom' },
    { src: '/photos/islamabad-blossom-close.webp', caption: 'Spring: pear blossom up close' },
    { src: '/photos/islamabad-amaltas-road.webp', caption: 'Summer: golden amaltas hanging over the roads, late May and June' },
    { src: '/photos/islamabad-amaltas-close.webp', caption: 'Summer: amaltas (golden shower) blossom up close' },
    { src: '/photos/islamabad-autumn-road.webp', caption: 'Autumn: red and gold trees lining the road, November to early December' },
    { src: '/photos/islamabad-autumn-leaves.webp', caption: 'Autumn: leaves turning pink, red and gold' },
    { src: '/photos/islamabad-autumn-sunset.webp', caption: 'Autumn: fallen leaves at sunset' }
  ],
  nathia: [
    { src: '/photos/mushkpuri-summer.webp', caption: 'Mushkpuri Top in summer: pine forest and wild daisies along the trail' },
    { src: '/photos/mushkpuri-mist.webp', caption: 'Clouds rolling over the Mushkpuri meadow, with cows grazing near the top' }
  ],
  murree: [
    { src: '/photos/murree-winter-snow-road.webp', caption: 'Winter: fresh snow on the road through the Murree hills' },
    { src: '/photos/murree-winter-road.webp', caption: 'Winter: a snow-lined bend under pine and cedar' },
    { src: '/photos/murree-winter-road-1122.webp', caption: 'Winter: Rescue 1122 on a snowy road. After heavy snow, roads ice over; check before you drive' },
    { src: '/photos/murree-winter-hills.webp', caption: 'Winter: snow on the hills around Murree at dusk' },
    { src: '/photos/murree-winter-clouds.webp', caption: 'Winter: snow clouds drifting over the forested slopes' },
    { src: '/photos/murree-summer.webp', caption: 'Summer: Murree at sunrise, pine forest and morning mist over the hills' }
  ],
  kundmalir: [
    { src: '/photos/kund-malir-beach.webp', caption: 'Kund Malir beach, with the Hingol hills along the shore' },
    { src: '/photos/kund-malir-waves.webp', caption: 'Green water and golden sand at Kund Malir' },
    { src: '/photos/golden-beach.webp', caption: 'Golden Beach and its jetty, just along the coast from Kund Malir' },
    { src: '/photos/golden-beach-road.webp', caption: 'The Makran Coastal Highway between the hills and Golden Beach' },
    { src: '/photos/golden-beach-jetty.webp', caption: 'The jetty at Golden Beach in the afternoon light' },
    { src: '/photos/princess-of-hope.webp', caption: 'Princess of Hope, the rock figure in Hingol National Park' },
    { src: '/photos/hingol-badlands.webp', caption: 'The Hingol badlands, with the Princess of Hope standing in the middle' },
    { src: '/photos/hingol-road-badlands.webp', caption: 'The Makran Coastal Highway winding through the Hingol hills' },
    { src: '/photos/mud-volcano-hingol.webp', caption: 'Mud volcano near the Makran coast, Hingol' },
    { src: '/photos/road-to-mud-volcano.webp', caption: 'The road to the mud volcanoes, with the sea beyond' }
  ],
  hunza: [
    { src: '/photos/baltit-fort-autumn.webp', caption: 'Autumn: Baltit Fort among golden poplars above Karimabad' },
    { src: '/photos/baltit-balcony-arches.webp', caption: 'Autumn: Rakaposhi and the Hunza valley through the carved arches of Baltit Fort' },
    { src: '/photos/baltit-balcony-throne.webp', caption: 'Autumn: the Mir’s balcony seat at Baltit Fort, looking down the valley' },
    { src: '/photos/baltit-window-autumn.webp', caption: 'Autumn: stained glass and an open window over the valley, inside Baltit Fort' },
    { src: '/photos/aliabad-kkh-autumn.webp', caption: 'Autumn: Rakaposhi at the end of the Karakoram Highway through golden poplars in Aliabad' },
    { src: '/photos/hunza-aerial-autumn.webp', caption: 'Autumn: Hunza valley from above, orchards turning red and orange' },
    { src: '/photos/hunza-apricot-autumn.webp', caption: 'Autumn: apricot trees glowing in morning sun above the valley' },
    { src: '/photos/hunza-peaks-autumn.webp', caption: 'Autumn: golden poplars below the snow peaks around Rakaposhi' },
    { src: '/photos/attabad-summer-cones.webp', caption: 'Summer: speedboats on Attabad Lake, with the Passu Cones behind' },
    { src: '/photos/attabad-summer-boats.webp', caption: 'Summer: boats and jet skis at the Attabad Lake jetty' },
    { src: '/photos/attabad-summer-boat-ride.webp', caption: 'Summer: a boat ride on the turquoise water of Attabad Lake' },
    { src: '/photos/hussaini-bridge-summer.webp', caption: 'Summer: walking the Hussaini Suspension Bridge, with the Passu Cones ahead' },
    { src: '/photos/hussaini-bridge-peaks.webp', caption: 'Summer: Hussaini bridge over the Hunza river, below snow peaks' },
    { src: '/photos/gulmit-viewpoint-autumn.webp', caption: 'Autumn: looking down on Gulmit, golden poplars along the Hunza river' },
    { src: '/photos/gulmit-valley-autumn.webp', caption: 'Autumn: Gulmit village and the bridge across the Hunza river, below snow peaks' },
    { src: '/photos/gulmit-road-autumn.webp', caption: 'Autumn: the road through Gulmit under orange and gold trees' },
    { src: '/photos/rakaposhi-view-autumn.webp', caption: 'Autumn: Rakaposhi above the Hunza river and golden poplars, from the Ghulmet viewpoint' },
    { src: '/photos/hoper-glacier-peaks.webp', caption: 'Hoper Glacier: the ice field below snow peaks in Nagar' },
    { src: '/photos/hoper-glacier-ice.webp', caption: 'Hoper Glacier: rows of ice pinnacles up close' },
    { src: '/photos/hoper-viewpoint-huts.webp', caption: 'Hoper: stone huts and cafés on the ridge above the glacier' },
    { src: '/photos/khunjerab-reflection.webp', caption: 'Khunjerab Pass: snow peaks mirrored in a meltwater pool at 15,397 ft' },
    { src: '/photos/khunjerab-glacier.webp', caption: 'Khunjerab Pass: a glacier between snow-covered peaks near the top' },
    { src: '/photos/khunjerab-border-gate.webp', caption: 'Khunjerab Pass: the China border gate at the end of the Karakoram Highway' }
  ],
  passu: [
    { src: '/photos/attabad-summer-cones.webp', caption: 'Summer: speedboats on Attabad Lake, with the Passu Cones behind' },
    { src: '/photos/attabad-summer-boats.webp', caption: 'Summer: boats and jet skis at the Attabad Lake jetty' },
    { src: '/photos/attabad-summer-boat-ride.webp', caption: 'Summer: a boat ride on the turquoise water of Attabad Lake' },
    { src: '/photos/hussaini-bridge-summer.webp', caption: 'Summer: walking the Hussaini Suspension Bridge, with the Passu Cones ahead' },
    { src: '/photos/hussaini-bridge-peaks.webp', caption: 'Summer: Hussaini bridge over the Hunza river, below snow peaks' },
    { src: '/photos/gulmit-viewpoint-autumn.webp', caption: 'Autumn: looking down on Gulmit, golden poplars along the Hunza river' },
    { src: '/photos/gulmit-valley-autumn.webp', caption: 'Autumn: Gulmit village and the bridge across the Hunza river, below snow peaks' },
    { src: '/photos/gulmit-road-autumn.webp', caption: 'Autumn: the road through Gulmit under orange and gold trees' },
    { src: '/photos/khunjerab-reflection.webp', caption: 'Khunjerab Pass: snow peaks mirrored in a meltwater pool at 15,397 ft' },
    { src: '/photos/khunjerab-glacier.webp', caption: 'Khunjerab Pass: a glacier between snow-covered peaks near the top' },
    { src: '/photos/khunjerab-border-gate.webp', caption: 'Khunjerab Pass: the China border gate at the end of the Karakoram Highway' }
  ],
  gilgit: [
    { src: '/photos/gilgit-night.webp', caption: 'Gilgit city lights at night, below the mountains' }
  ],
  nagar: [
    { src: '/photos/rakaposhi-view-autumn.webp', caption: 'Autumn: Rakaposhi above the Hunza river and golden poplars, from the Ghulmet viewpoint' },
    { src: '/photos/hoper-glacier-peaks.webp', caption: 'Hoper Glacier: the ice field below snow peaks in Nagar' },
    { src: '/photos/hoper-glacier-ice.webp', caption: 'Hoper Glacier: rows of ice pinnacles up close' },
    { src: '/photos/hoper-viewpoint-huts.webp', caption: 'Hoper: stone huts and cafés on the ridge above the glacier' }
  ],
  shigar: [
    { src: '/photos/shigar-garden-peaks.webp', caption: 'Autumn: the royal garden at Shigar Fort, red and gold trees below snow peaks' },
    { src: '/photos/shigar-garden-autumn.webp', caption: 'Autumn: sunlight through the orchard trees in the Shigar Fort garden' },
    { src: '/photos/shigar-lane-autumn.webp', caption: 'Autumn: the lane beside the stream outside Shigar Fort, under golden poplars' }
  ],
  rama: [
    { src: '/photos/rama-meadows-peaks.webp', caption: 'Summer: Rama Meadows, pine forest below the glaciers of Nanga Parbat' },
    { src: '/photos/rama-fields-evening.webp', caption: 'Summer: evening light on the fields and pines below Rama' },
    { src: '/photos/astore-river-bridge.webp', caption: 'Summer: a log footbridge over the clear Astore river' },
    { src: '/photos/astore-valley-village.webp', caption: 'Summer: a village in Astore valley below the mountains' },
    { src: '/photos/astore-village-hillside.webp', caption: 'Summer: colourful houses on a green hillside in Astore' },
    { src: '/photos/chilam-lake-summer.webp', caption: 'Summer: a lake in the high meadows past Chilam, on the road to Minimarg' },
    { src: '/photos/minimarg-road-switchbacks.webp', caption: 'Summer: the road zigzagging down from Burzil Pass towards Minimarg' },
    { src: '/photos/burzil-road-summer.webp', caption: 'Summer: the road climbing to Burzil Pass through green alpine slopes' },
    { src: '/photos/burzil-top-sign.webp', caption: 'Burzil Top at 13,808 ft, the army checkpost on the way to Minimarg' },
    { src: '/photos/minimarg-village-valley.webp', caption: 'Summer: Minimarg village and its fields, in a valley of pine slopes' },
    { src: '/photos/minimarg-wooden-village.webp', caption: 'Summer: wooden houses and haystacks among the fields at Minimarg' },
    { src: '/photos/minimarg-river-houses.webp', caption: 'Summer: log houses above the stream at Minimarg' },
    { src: '/photos/minimarg-forest-evening.webp', caption: 'Summer: evening light over the forests around Minimarg' },
    { src: '/photos/deosai-sheosar-horses.webp', caption: 'Over Deosai to Skardu: horses grazing by Sheosar Lake on the Deosai Plains' },
    { src: '/photos/deosai-storm-peaks.webp', caption: 'Over Deosai to Skardu: storm clouds over the Deosai Plains, snow peaks on the horizon' },
    { src: '/photos/deosai-plains-clouds.webp', caption: 'Over Deosai to Skardu: low cloud over the open grassland of Deosai' },
    { src: '/photos/deosai-stream.webp', caption: 'Over Deosai to Skardu: a stream winding across the Deosai Plains' }
  ],
  abbottabad: [
    { src: '/photos/abbottabad-valley-view.webp', caption: 'Abbottabad valley from Shimla Hill, through the pines' },
    { src: '/photos/abbottabad-public-park.webp', caption: 'Winter morning: the old Cantonment Reading Room in Abbottabad’s Public Park' },
    { src: '/photos/abbottabad-road-hills.webp', caption: 'Driving into Abbottabad, with the hills of Hazara behind' }
  ],
  naran: [
    { src: '/photos/saif-ul-malook-summer.webp', caption: 'Summer: Lake Saif-ul-Malook under rolling clouds, with snow patches on the slopes' },
    { src: '/photos/naran-summer-peaks.webp', caption: 'Summer: snow-streaked peaks above the valley beyond Naran' },
    { src: '/photos/naran-babusar-road-summer.webp', caption: 'Summer: the road from Naran towards Babusar Top, past terraced fields and roadside dhabas' },
    { src: '/photos/naran-babusar-village-summer.webp', caption: 'Summer: a village on the way up to Babusar Top' },
    { src: '/photos/naran-autumn-huts.webp', caption: 'Autumn: stone huts under orange chinar and walnut trees, the ground thick with leaves' },
    { src: '/photos/naran-autumn-park.webp', caption: 'Autumn: red and gold trees in a meadow below the pine slopes' },
    { src: '/photos/naran-autumn-road.webp', caption: 'Autumn: a winding road through golden trees in Kaghan valley' },
    { src: '/photos/naran-autumn-leaves.webp', caption: 'Autumn: sunlight through the trees on a carpet of fallen leaves' },
    { src: '/photos/kaghan-winter-river.webp', caption: 'Winter: the Kunhar river below Kaghan, with snow on the slopes' },
    { src: '/photos/kaghan-winter-stream.webp', caption: 'Winter: a side stream through snow-covered boulders in Kaghan valley' },
    { src: '/photos/kaghan-snowfall.webp', caption: 'Winter: snowfall over the river huts at Kaghan' },
    { src: '/photos/kaghan-winter-village.webp', caption: 'Winter: a village lane in Kaghan valley after snow. The road beyond Kaghan to Naran is closed from about December to April' },
    { src: '/photos/babusar-snow-walls.webp', caption: 'Early summer: the road over Babusar Top cut through walls of snow' },
    { src: '/photos/babusar-top-road.webp', caption: 'Summer: riding over Babusar Top at 13,690 ft, snow still on the slopes' },
    { src: '/photos/babusar-valley-storm.webp', caption: 'Summer: the valley below Babusar Top as a storm rolls in' }
  ],
  thandiani: [
    { src: '/photos/thandiani-summer-road.webp', caption: 'Summer: the winding road up to Thandiani through pine forest' },
    { src: '/photos/thandiani-summer-forest.webp', caption: 'Summer: red-roofed hotels among the pines' },
    { src: '/photos/thandiani-summer-mosque.webp', caption: 'Summer: a hillside mosque in the green hills' }
  ],
  khaplu: [
    { src: '/photos/khaplu-palace-autumn.webp', caption: 'Autumn: Khaplu Palace (Yabgo Khar) under golden chinar and poplar, late October to early November' },
    { src: '/photos/barah-pond-autumn.webp', caption: 'Autumn: a clear stream spilling into a still pond under golden willows in Barah Valley' },
    { src: '/photos/barah-road-river-autumn.webp', caption: 'Autumn: the road through Barah Valley between golden poplars and the braided Shyok river' },
    { src: '/photos/barah-orchards-autumn.webp', caption: 'Autumn: terraced orchards in Barah Valley below a rocky peak' },
    { src: '/photos/ghowari-poplar-avenue.webp', caption: 'Autumn: a lane through towering golden poplars at Ghowari, on the Skardu to Khaplu road' },
    { src: '/photos/ghowari-poplar-road.webp', caption: 'Autumn: the road through Ghowari between rows of golden poplars and stone walls' },
    { src: '/photos/ghowari-willow-poplars.webp', caption: 'Autumn: willow branches in front of a wall of golden poplars at Ghowari' },
    { src: '/photos/keris-bridge-autumn.webp', caption: 'On the way: Keris bridge over the Shyok in autumn, with golden poplars on the far bank' },
    { src: '/photos/keris-bridge-reflection.webp', caption: 'On the way: poplars and the Keris bridge reflected in the river' },
    { src: '/photos/keris-bridge-sand.webp', caption: 'On the way: wind-rippled sand on the riverbank below Keris bridge' }
  ],
  skardu: [
    { src: '/photos/shangrila-autumn.webp', caption: 'Autumn: Shangrila (Lower Kachura Lake) from above, ringed by golden poplars and red roofs' },
    { src: '/photos/skardu-city-autumn-peaks.webp', caption: 'Autumn: Skardu town among golden poplars on a misty morning, fresh snow on the peaks' },
    { src: '/photos/skardu-city-autumn-mist.webp', caption: 'Autumn: morning mist over the Skardu valley and the main road through town' },
    { src: '/photos/katpana-mist-poplars.webp', caption: 'Autumn: dawn mist over poplars and a mosque, seen from the Katpana cold desert' },
    { src: '/photos/katpana-dunes.webp', caption: 'Katpana cold desert: sand dunes at sunrise, just outside Skardu' },
    { src: '/photos/deosai-sheosar-horses.webp', caption: 'Day trip to Deosai: horses grazing by Sheosar Lake on the Deosai Plains' },
    { src: '/photos/deosai-storm-peaks.webp', caption: 'Day trip to Deosai: storm clouds over the Deosai Plains, snow peaks on the horizon' },
    { src: '/photos/deosai-plains-clouds.webp', caption: 'Day trip to Deosai: low cloud over the open grassland of Deosai' },
    { src: '/photos/deosai-stream.webp', caption: 'Day trip to Deosai: a stream winding across the Deosai Plains' },
    { src: '/photos/shigar-garden-peaks.webp', caption: 'Day trip to Shigar: the royal garden at Shigar Fort, red and gold trees below snow peaks' },
    { src: '/photos/shigar-garden-autumn.webp', caption: 'Day trip to Shigar: sunlight through the orchard trees in the Shigar Fort garden' },
    { src: '/photos/shigar-lane-autumn.webp', caption: 'Day trip to Shigar: the lane beside the stream outside Shigar Fort, under golden poplars' },
    { src: '/photos/skardu-road-autumn.webp', caption: 'On the way: the Jaglot to Skardu road in autumn, golden poplars below fresh snow' },
    { src: '/photos/ghowari-poplar-avenue.webp', caption: 'Day trip to Khaplu: a lane through towering golden poplars at Ghowari, on the Skardu to Khaplu road' },
    { src: '/photos/ghowari-poplar-road.webp', caption: 'Day trip to Khaplu: the road through Ghowari between rows of golden poplars and stone walls' },
    { src: '/photos/ghowari-willow-poplars.webp', caption: 'Day trip to Khaplu: willow branches in front of a wall of golden poplars at Ghowari' },
    { src: '/photos/keris-bridge-autumn.webp', caption: 'Day trip to Khaplu: Keris bridge over the Shyok in autumn, with golden poplars on the far bank' },
    { src: '/photos/keris-bridge-reflection.webp', caption: 'Day trip to Khaplu: poplars and the Keris bridge reflected in the river' },
    { src: '/photos/keris-bridge-sand.webp', caption: 'Day trip to Khaplu: wind-rippled sand on the riverbank below Keris bridge' }
  ],
  shogran: [
    { src: '/photos/shogran-winter-view.webp', caption: 'Winter: Shogran under snow, with the Kaghan peaks behind' },
    { src: '/photos/shogran-winter-aerial.webp', caption: 'Winter: hotels and huts on the Shogran plateau after a snowfall' },
    { src: '/photos/shogran-winter-cabins.webp', caption: 'Winter: village houses and cabins buried in snow. The jeep road from Kiwai can close after heavy snow' }
  ],
  lahore: [
    { src: '/photos/lahore-azadi-chowk-sunrise.webp', caption: 'Sunrise over Azadi Chowk, with Minar-e-Pakistan and the Badshahi Mosque' },
    { src: '/photos/lahore-pink-blossom.webp', caption: 'Spring: pink tabebuia in bloom across the city, March and April' },
    { src: '/photos/lahore-white-blossom.webp', caption: 'Spring: white blossom at sunset' },
    { src: '/photos/lahore-summer-amaltas-canal.webp', caption: 'Summer: golden amaltas along a canal-side path, May and June' },
    { src: '/photos/lahore-summer-amaltas-water.webp', caption: 'Summer: amaltas reflected in rain water after a monsoon shower' },
    { src: '/photos/lahore-model-town-autumn.webp', caption: 'Autumn in Model Town Park: golden trees and a carpet of leaves, late November to January' },
    { src: '/photos/lahore-model-town-leaves.webp', caption: 'Model Town Park: a morning walk under the yellow leaves' },
    { src: '/photos/lahore-model-town-canopy.webp', caption: 'Model Town Park: old trees turning gold' },
    { src: '/photos/lahore-model-town-ground.webp', caption: 'Model Town Park: fallen leaves under the trees' },
    { src: '/photos/lahore-model-town-trees.webp', caption: 'Model Town Park: winding trunks on a misty morning' },
    { src: '/photos/lahore-basant-minaret.webp', caption: 'Basant: kites over the rooftops at sunset, by a lit minaret' },
    { src: '/photos/lahore-basant-rooftops.webp', caption: 'Basant: the sky full of kites over the old city, February. Dates are announced by the Punjab government each year' },
    { src: '/photos/lahore-basant-sun.webp', caption: 'Basant: a kite against the setting sun' },
    { src: '/photos/lahore-orange-line.webp', caption: 'The Orange Line metro train: an easy, air-conditioned way across the city' },
    { src: '/photos/lahore-aerial-fields.webp', caption: 'Green wheat fields meeting the city at its edge' },
    { src: '/photos/lahore-winter-fog-bikes.webp', caption: 'Winter: dense fog on Lahore’s roads, December and January. Motorways often close at night; drive by day' },
    { src: '/photos/lahore-winter-fog-road.webp', caption: 'Winter: headlights in the evening fog' },
    { src: '/photos/lahore-winter-fog-walk.webp', caption: 'Winter: walking home through the fog' },
    { src: '/photos/lahore-winter-fog-lights.webp', caption: 'Winter: traffic glowing through fog and smog' }
  ],
  chakwal: [
    { src: '/photos/swaik-lake.webp', caption: 'Swaik Lake near Kallar Kahar: an emerald pool in a green gorge' },
    { src: '/photos/swaik-lake-ferns.webp', caption: 'Swaik Lake: spring water dripping through ferns into the pool' },
    { src: '/photos/kallar-kahar-lake.webp', caption: 'Kallar Kahar Lake from the hill above the town' },
    { src: '/photos/kallar-kahar-lake-haze.webp', caption: 'The lake and its reed beds on a hazy summer day' },
    { src: '/photos/kallar-kahar-hills.webp', caption: 'The Salt Range hills around Kallar Kahar after rain' }
  ],
  bahawalpur: [
    { src: '/photos/derawar-fort.webp', caption: 'Derawar Fort: forty bastions rising out of the Cholistan desert' },
    { src: '/photos/derawar-abbasi-mosque.webp', caption: 'The white marble Abbasi Mosque beside Derawar Fort' },
    { src: '/photos/bahawalpur-noor-mahal.webp', caption: 'Noor Mahal, the Nawabs’ palace in Bahawalpur' },
    { src: '/photos/bahawalpur-farid-gate.webp', caption: 'Farid Gate into the old bazaar, lit up at night' }
  ],
  multan: [
    { src: '/photos/multan-shah-rukn-e-alam.webp', caption: 'The tomb of Shah Rukn-e-Alam, Multan’s landmark from the 1320s' },
    { src: '/photos/multan-fort-aerial.webp', caption: 'The old fort mound from above: Shah Rukn-e-Alam’s tomb, Qasim Bagh and the city beyond' }
  ],
  uch: [{ src: '/photos/uch-sharif-tombs.webp', caption: 'The tombs of Bibi Jawindi (centre), Baha’al-Halim (left) and Ustad Nuriya (right), Uch Sharif' }, { src: '/photos/derawar-fort.webp', caption: 'Nearby: Derawar Fort in the Cholistan desert' }],
  thatta: [
    { src: '/photos/thatta-shah-jahan-arches.webp', caption: 'Shah Jahan Mosque: rows of brick arches and glazed tiles' },
    { src: '/photos/thatta-shah-jahan-hall.webp', caption: 'Inside the Shah Jahan Mosque, built in the 1640s' },
    { src: '/photos/thatta-shah-jahan-aerial.webp', caption: 'The Shah Jahan Mosque and its gardens from above, in the middle of Thatta' },
    { src: '/photos/keenjhar-lake.webp', caption: 'Keenjhar Lake: boats, huts and the resort on the shore' },
    { src: '/photos/keenjhar-lake-resort.webp', caption: 'The Keenjhar Lake resort and boat jetty from above' }
  ],
  hyderabad: [{ src: '/photos/hyderabad-bangles.webp', caption: 'Glass bangles, Hyderabad’s famous craft, in the old bazaar' }],
  gwadar: [
    { src: '/photos/ormara-beach-evening.webp', caption: 'On the way: Ormara beach in the evening, below the Hammerhead cliffs' },
    { src: '/photos/ormara-hammerhead-dusk.webp', caption: 'On the way: the Ormara headland at dusk' },
    { src: '/photos/ormara-sunset.webp', caption: 'On the way: sunset over the sea at Ormara' }
  ],
  sukkur: [{ src: '/photos/sukkur-lansdowne-bridge.webp', caption: 'Lansdowne Bridge over the Indus at sunset, with the Ayub arch bridge behind' }, { src: '/photos/indus-highway-sindh.webp', caption: 'The Indus Highway through the date palms near Shikarpur' }]
};
/** Our own photo of a place, if we have one. */
/** Photos the admin set for a place (a web link), ahead of ours. */
export const PHOTO_EDITS: Record<string, string> = {};
/** Places we have no photo of yet: their Wikipedia article's main photo (free licences on Wikimedia Commons), with credit. */
const WIKI_PAGES: Record<string, string> = { taxila: 'Taxila', fairy: 'Fairy_Meadows_National_Park' };
export interface WebPhoto { src: string; page: string; credit: string }
const WEB: Record<string, WebPhoto | null> = {};
const webSubs = new Set<() => void>();
export const onWebPhoto = (f: () => void) => { webSubs.add(f); return () => { webSubs.delete(f); }; };
/** The Wikipedia photo for a place without one of ours, loading it the first time it's asked for. */
export function webPhoto(id: string): WebPhoto | null {
  const page = WIKI_PAGES[id]; if (!page || OWN[id]) return null;
  if (!(id in WEB)) {
    WEB[id] = null;
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page)}`).then(r => r.json()).then(j => {
      const src = j?.originalimage?.source || j?.thumbnail?.source; if (!src) return;
      // A 1280 px copy is plenty, and much lighter than the original.
      const sized = j?.thumbnail?.source && /\/\d+px-/.test(j.thumbnail.source) ? j.thumbnail.source.replace(/\/\d+px-/, '/1280px-') : src;
      WEB[id] = { src: sized, page: j?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${page}`, credit: 'Photo from Wikipedia (Wikimedia Commons)' };
      webSubs.forEach(f => f());
    }).catch(() => {});
  }
  return WEB[id];
}
/** Our photos of a place by season; the trip's season is shown when we have it, else any of them. */
type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';
const SEASONAL: Record<string, Partial<Record<SeasonName, string>>> = {
  murree: { summer: '/photos/murree-summer.webp', winter: '/photos/murree-winter-snow-road.webp' },
  nathia: { summer: '/photos/mushkpuri-summer.webp' },
  hunza: { summer: '/photos/attabad-summer-cones.webp' },
  passu: { summer: '/photos/attabad-summer-cones.webp' },
  naran: { summer: '/photos/saif-ul-malook-summer.webp', autumn: '/photos/naran-autumn-huts.webp', winter: '/photos/kaghan-winter-river.webp' },
  khaplu: { autumn: '/photos/khaplu-palace-autumn.webp' },
  shogran: { winter: '/photos/shogran-winter-view.webp' },
  thandiani: { summer: '/photos/thandiani-summer-road.webp' },
  lahore: { spring: '/photos/lahore-pink-blossom.webp', summer: '/photos/lahore-summer-amaltas-canal.webp', autumn: '/photos/lahore-model-town-autumn.webp', winter: '/photos/lahore-azadi-chowk-sunrise.webp' },
  islamabad: { spring: '/photos/islamabad-jacaranda-path.webp', summer: '/photos/islamabad-amaltas-road.webp', autumn: '/photos/islamabad-autumn-road.webp' }
};
const seasonName = (m: number): SeasonName => [3, 4, 5].includes(m) ? 'spring' : [6, 7, 8].includes(m) ? 'summer' : [9, 10, 11].includes(m) ? 'autumn' : 'winter';
export const ownPhoto = (id: string, month?: number): string | undefined => {
  const by = SEASONAL[id];
  return PHOTO_EDITS[id] || (by && month ? by[seasonName(month)] : undefined) || OWN[id] || (by ? Object.values(by)[0] : undefined);
};

/** A small, stable number for a trip, so it keeps the same photo each time it opens. */
const pick = (key: string, n: number) => { let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % n; };

/** This trip's photo: one of ours for an autumn trip to an autumn-colour place, or null to use the guide's photo. */
export function destPhoto(id: string, month: number, startDate = '') {
  if (!AUTUMN_MONTHS.includes(month) || !wishPlaces('autumn').some(p => p.id === id)) return null;
  if (ownPhoto(id, month)) return { src: ownPhoto(id, month)! };
  return { src: AUTUMN[pick(id + startDate, AUTUMN.length)] };
}

const COAST = ['karachi'], HERITAGE = ['lahore'], INTERIOR_SINDH = ['mohenjo', 'sehwan'];
/** A background for the trip's share card: our photo for the place and season, else one for the season. */
export function cardPhoto(id: string, month: number, startDate = '') {
  if (ownPhoto(id, month)) return ownPhoto(id, month)!;
  const own = destPhoto(id, month, startDate); if (own) return own.src;
  if (COAST.includes(id)) return '/photos/sea-sunset.webp';
  if (HERITAGE.includes(id)) return '/photos/mosque-arches.webp';
  if (INTERIOR_SINDH.includes(id)) return '/photos/indus-highway-sindh.webp';
  if ([10, 11].includes(month)) return '/photos/autumn-hunza.webp';
  if ([12, 1, 2].includes(month)) return '/photos/snowfall.webp';
  if ([3, 4].includes(month)) return '/photos/blossom.webp';
  return '/photos/green-valley.webp';
}
