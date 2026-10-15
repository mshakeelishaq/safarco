// Everyone who has signed in to SafarCo: how many, who joined lately, and what each has saved or written.
// Read-only. The list comes from supabase/users.sql, which only answers admins.
import { useEffect, useState } from 'react';
import { css } from '../../lib/css';
import { listUsers, type AppUser } from '../../cloud';
import { H2, Tag, box, text } from './ui';

const day = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'never';
const ago = (d: string | null) => d ? (Date.now() - +new Date(d)) / 864e5 : Infinity;

export function UsersTab() {
  const [users, setUsers] = useState<AppUser[] | null>(null), [err, setErr] = useState(''), [q, setQ] = useState(''), [sort, setSort] = useState<'new' | 'active' | 'trips'>('new');
  useEffect(() => { listUsers().then(setUsers).catch(e => setErr(/admin_users|function/i.test((e as Error).message || '') ? 'The Users list isn’t set up yet: paste app/supabase/users.sql into Supabase → SQL Editor → New query → Run, then reload.' : 'Couldn’t load users: ' + ((e as Error).message || 'unknown error'))); }, []);
  if (err) return <section style={box}><H2>Users</H2><p style={css('color:var(--cor);font-weight:700;margin:0')}>{err}</p></section>;
  if (!users) return <section style={box}><H2>Users</H2><p style={css('color:var(--mute);margin:0')}>Loading…</p></section>;
  const week = users.filter(u => ago(u.created_at) <= 7).length, month = users.filter(u => ago(u.created_at) <= 30).length, active = users.filter(u => ago(u.last_sign_in_at) <= 30).length;
  const withTrips = users.filter(u => u.trips > 0).length;
  const list = users.filter(u => !q || `${u.email} ${u.name}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'trips' ? b.trips - a.trips : sort === 'active' ? ago(a.last_sign_in_at) - ago(b.last_sign_in_at) : +new Date(b.created_at) - +new Date(a.created_at));
  const Stat = ({ n, label }: { n: number; label: string }) => <div style={css('padding:12px;border-radius:14px;background:var(--fill)')}><div style={css('font-size:24px;font-weight:800')}>{n}</div><div style={css('font-size:12px;font-weight:700;color:var(--mute)')}>{label}</div></div>;
  return (
    <section style={box}>
      <H2 sub="Everyone who has signed in with Google (and admins with a password). To remove someone, delete them in Supabase → Authentication → Users; their saved trips and reviews go with them.">Users</H2>
      <div style={css('display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:14px')}>
        <Stat n={users.length} label="Signed up" /><Stat n={week} label="Joined this week" /><Stat n={month} label="Joined in 30 days" />
        <Stat n={active} label="Signed in, last 30 days" /><Stat n={withTrips} label="Saved a trip" />
      </div>
      <div style={css('display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px')}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search email or name…" style={{ ...text, flex: '1 1 220px', width: 'auto' }} />
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} style={{ ...text, width: 'auto' }}>
          <option value="new">Newest first</option><option value="active">Last signed in</option><option value="trips">Most trips</option>
        </select>
      </div>
      {list.map(u => (
        <div key={u.id} style={css('padding:10px 0;border-bottom:1px solid var(--line)')}>
          <div style={css('display:flex;gap:8px;align-items:center;flex-wrap:wrap')}>
            <b style={css('font-size:15px;word-break:break-all')}>{u.name || u.email}</b>
            {u.is_admin && <Tag tone="g">Admin</Tag>}{ago(u.created_at) <= 7 && <Tag tone="amb">New</Tag>}
            <Tag>{u.provider === 'email' ? 'Password' : u.provider ? u.provider[0].toUpperCase() + u.provider.slice(1) : 'Unknown'}</Tag>
          </div>
          <div style={css('font-size:13px;color:var(--mute);margin-top:3px;line-height:1.5')}>
            {u.name ? `${u.email} · ` : ''}joined {day(u.created_at)} · last signed in {day(u.last_sign_in_at)} · {u.trips} trip{u.trips === 1 ? '' : 's'} saved · {u.reviews} review{u.reviews === 1 ? '' : 's'} · {u.tips} food tip{u.tips === 1 ? '' : 's'}
          </div>
        </div>
      ))}
      {!list.length && <p style={css('color:var(--mute)')}>No one matches.</p>}
    </section>
  );
}
