// /privacy and /terms. Plain-language pages; have a lawyer review them before a large launch.
import { css } from '../lib/css';

const CONTACT = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || '';
const UPDATED = '10 October 2026';

const Page = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div data-sc="1" data-theme="paper" style={css('min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--font)')}>
    <main style={css('max-width:720px;margin:0 auto;padding:32px 20px 60px;font-size:16px;line-height:1.65')}>
      <a href="/" style={css('display:inline-flex;align-items:center;gap:6px;font-weight:700;text-decoration:none')}><i className="ph-bold ph-arrow-left" />Back to SafarCo</a>
      <h1 style={css('font-family:var(--fontH);font-size:32px;line-height:1.2;margin:20px 0 4px')}>{title}</h1>
      <p style={css('color:var(--mute);margin:0 0 24px;font-size:14px')}>Last updated {UPDATED}</p>
      {children}
    </main>
  </div>
);
const H = ({ children }: { children: React.ReactNode }) => <h2 style={css('font-size:20px;margin:28px 0 8px')}>{children}</h2>;
const contact = CONTACT ? <a href={`mailto:${CONTACT}`}>{CONTACT}</a> : <>the <b>Send feedback</b> button in the app</>;

export function Privacy() {
  return (
    <Page title="Privacy policy">
      <p>SafarCo is a free trip planner for Pakistan. We collect as little as we can, and we never sell your data or show ads.</p>
      <H>What stays on your phone</H>
      <p>Your trips, theme and settings are saved in your browser on your device. They don’t leave it unless you sign in or share a trip.</p>
      <H>If you sign in with Google</H>
      <p>We receive your name, email address and profile picture from Google, and we store the trips you save so you can open them on other devices. Only you can see your trips. They are stored with Supabase (our database provider). You can delete any trip in <b>My trips</b>. To delete your account and all your trips, contact us at {contact}.</p>
      <H>Your location</H>
      <p>If you tap <b>Use my current location</b>, your phone shares its position with SafarCo to find your starting city. We send a rounded position (about 1 km) to our place-search provider to find the town name. We don’t store your location.</p>
      <H>Services that help run SafarCo</H>
      <p>To plan your trip, the app sends the places and dates you choose (never your name or email) to:</p>
      <ul>
        <li><b>Vercel</b>: hosts the app. It also counts page visits anonymously, without cookies.</li>
        <li><b>OpenRouteService</b>: road routes and distances.</li>
        <li><b>Geoapify</b> (OpenStreetMap data): place search, sights and places to stay.</li>
        <li><b>Open-Meteo</b>: weather.</li>
        <li><b>Wikivoyage and Wikipedia</b>: destination guides.</li>
        <li><b>ExchangeRate-API</b>: the US dollar rate.</li>
        <li><b>OpenFreeMap and AWS terrain tiles</b>: the map.</li>
      </ul>
      <p>Each has its own privacy policy. When you tap <b>Check prices</b>, you go to Booking.com, and their policy applies there.</p>
      <H>Feedback and errors</H>
      <p>If you send feedback, we store your message and any contact details you add, to reply and to fix the app. If the app crashes, it sends us a short technical error report with no personal details.</p>
      <H>Children</H>
      <p>SafarCo is meant for adults planning trips. We don’t knowingly collect information from children under 13.</p>
      <H>Changes and contact</H>
      <p>If this policy changes, we’ll update the date above. Questions: {contact}.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms of use">
      <p>SafarCo is a free trip-planning guide. By using it, you agree to these terms.</p>
      <H>Information is a guide, not a guarantee</H>
      <p>Routes, driving times, road and pass openings, weather, prices and places come from live services and from a price list we check regularly. Each price shows when it was last checked. Roads in the north can close suddenly because of snow, landslides or security, and prices change. <b>Always confirm road status with local authorities, and prices with the hotel or operator, before you travel.</b></p>
      <H>Your safety is your responsibility</H>
      <p>Drive in daylight on mountain roads, follow police and NHA instructions, and don’t take routes that a plan suggests if conditions on the ground are unsafe. SafarCo is not responsible for losses, delays, costs or injuries during a trip.</p>
      <H>Bookings and other websites</H>
      <p>SafarCo doesn’t sell or book anything. Links such as <b>Check prices</b> take you to other websites, like Booking.com, whose own terms apply. We may earn a small commission from some links, at no extra cost to you.</p>
      <H>Fair use</H>
      <p>Please don’t misuse the service, for example by automated scraping or by sending spam through feedback.</p>
      <H>Changes</H>
      <p>We may update SafarCo and these terms. Contact: {contact}.</p>
    </Page>
  );
}
