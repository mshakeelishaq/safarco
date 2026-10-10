// Co-pilot tool definitions. Shared by the browser (which runs the tools against
// the trip) and the server (which sends them to Claude). No DOM access here.

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object' as const, properties, required, additionalProperties: false });

export const TRANSPORT_MODES = ['sedan', 'suv', 'bike', 'public', 'air', 'rentcar', 'rent4x4', 'coaster'] as const;
export const STAY_TIERS = ['backpacker', 'standard', 'premium'] as const;

export const TOOL_SCHEMAS = [
  { name: 'get_trip_summary', description: 'Get the current trip: route, dates, people, transport, total cost and night stops.', input_schema: obj({}) },
  { name: 'set_destination', description: 'Change the destination to any city or tourist place in Pakistan.', input_schema: obj({ place: { type: 'string' } }, ['place']) },
  { name: 'set_origin', description: 'Change the home city the trip starts from.', input_schema: obj({ city: { type: 'string' } }, ['city']) },
  { name: 'set_dates', description: 'Set the start date (YYYY-MM-DD) and/or the number of days (2–14).', input_schema: obj({ start_date: { type: 'string' }, days: { type: 'integer' } }) },
  { name: 'set_travellers', description: 'Set how many adults, kids (under 12) and elders (60+) are travelling.', input_schema: obj({ adults: { type: 'integer' }, kids: { type: 'integer' }, elders: { type: 'integer' } }) },
  { name: 'set_transport', description: 'Set transport: sedan, suv (own 4x4), bike, public (coach), air, rentcar (car + driver), rent4x4, coaster.', input_schema: obj({ mode: { type: 'string', enum: [...TRANSPORT_MODES] } }, ['mode']) },
  { name: 'set_stay_level', description: 'Set hotel level: backpacker, standard or premium.', input_schema: obj({ tier: { type: 'string', enum: [...STAY_TIERS] } }, ['tier']) },
  { name: 'set_rooms', description: 'Rooms: separate (doubles) or shared (family rooms).', input_schema: obj({ rooms: { type: 'string', enum: ['separate', 'shared'] } }, ['rooms']) },
  { name: 'set_budget', description: 'Set the total budget cap in PKR.', input_schema: obj({ pkr: { type: 'integer' } }, ['pkr']) },
  { name: 'set_departure_time', description: 'Daily departure time on driving days as HH:MM (24h), or "auto".', input_schema: obj({ time: { type: 'string' } }, ['time']) },
  { name: 'show_alert', description: 'Pin a short alert banner on the trip (weather, road, safety).', input_schema: obj({ title: { type: 'string' }, message: { type: 'string' } }, ['title', 'message']) }
];
export type ToolName = typeof TOOL_SCHEMAS[number]['name'];

export const systemPrompt = (today: string, summary: string) =>
  `You are SafarCo's trip co-pilot for road trips in Pakistan. Today is ${today}. Use the tools to change the trip whenever the user asks; never ask the user to edit anything by hand. ` +
  `After acting, reply in 1–3 short sentences in the user's language (English or Roman Urdu), quoting the new total and any warning. Distances are in km and heights in feet. ` +
  `Only state road or weather conditions that come from the trip summary or a tool result. Current state: ${summary}`;
