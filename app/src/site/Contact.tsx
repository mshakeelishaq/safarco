// Contact: a message form (goes to the admin's Feedback), Instagram, and email if set.
import { useState } from 'react';
import { Footer, Header, usePage } from './Site';
import { cloudEnabled, sendFeedback } from '../cloud';
import { CONTACT_EMAIL, IG_HANDLE, IG_MESSAGE } from '../contact';

const EMAIL = CONTACT_EMAIL;

export function Contact() {
  usePage('Contact', 'Get in touch with SafarCo: questions, corrections to a guide, partnerships with hotels and drivers, or feedback.');
  const [msg, setMsg] = useState(''), [from, setFrom] = useState(''), [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const send = async () => {
    if (msg.trim().length < 5) return;
    setState('sending');
    try { await sendFeedback(msg.trim(), from.trim(), '/contact'); setState('sent'); setMsg(''); } catch { setState('error'); }
  };
  return <>
    <Header />
    <section className="band"><div className="site-wrap">
      <div className="kicker">Contact</div>
      <h1>Get in touch</h1>
      <p>Questions, a correction to a guide, a hotel or driver you’d like to recommend, or a partnership: we read every message.</p>
    </div></section>
    <section style={{ paddingBottom: 60 }}><div className="site-wrap guide">
      <div className="panel" style={{ padding: 26 }}>
        {state === 'sent' ? <div className="note g"><i className="ph-fill ph-check-circle" style={{ fontSize: 20 }} /><span>Thank you. Your message reached us{from ? ', and we’ll reply to you there' : ''}.</span></div> : <form onSubmit={e => { e.preventDefault(); send(); }} style={{ display: 'grid', gap: 16 }}>
          <label className="field">Your message<textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="How can we help?" required minLength={5} /></label>
          <label className="field">Email or WhatsApp, if you’d like a reply<input value={from} onChange={e => setFrom(e.target.value)} placeholder="you@example.com or 0300 1234567" /></label>
          {state === 'error' && <div className="note cor"><span>Couldn’t send just now. Try again, or message us on Instagram.</span></div>}
          {!cloudEnabled && <div className="note amb"><span>The form isn’t connected yet. Please message us on Instagram.</span></div>}
          <div><button type="submit" className="btn btn-ink" disabled={state === 'sending' || !cloudEnabled}>{state === 'sending' ? 'Sending…' : 'Send message'}</button></div>
        </form>}
      </div>
      <aside>
        <div className="panel">
          <h3>Other ways</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <a href={IG_MESSAGE} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}><i className="ph-fill ph-instagram-logo" />@{IG_HANDLE}</a>
            {EMAIL && <a href={`mailto:${EMAIL}`} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}><i className="ph-fill ph-at" />{EMAIL}</a>}
          </div>
        </div>
        <div className="panel">
          <h3>Hotels and drivers</h3>
          <p style={{ margin: 0, lineHeight: 1.55, color: 'var(--ink2)' }}>Run a guest house, or drive a jeep in the north? Tell us about it. Places and drivers we trust are shown first in travellers’ plans, with a WhatsApp button.</p>
        </div>
      </aside>
    </div></section>
    <Footer />
  </>;
}
