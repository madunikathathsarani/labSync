import React, { useState, useEffect } from 'react';
import { getActiveFaultsForAsset, getAssetLabId, getLabId, getLabName } from './Faultutils';

import banner1 from './banner1.png';
import banner2 from './banner2.png';
import banner3 from './banner3.jpg';

// How long each banner stays on screen (milliseconds). Smaller = faster.
const SLIDE_MS = 3500;

const SLIDES = [
  { img: banner1, title: 'WELCOME', sub: 'Computer labs, fault tickets and reservations in one place.' },
  { img: banner2, title: 'Computer Labs & Reservation', sub: 'Explore our lab facilities and book your lecture sessions with ease.' },
  { img: banner3, title: 'Department of Information Technology', sub: 'Faculty of Social Sciences and Languages, SUSL.' },
];

/* ---------- Helpers ---------- */

const CLOSED = ['resolved', 'fixed', 'done', 'closed', 'completed'];
const isOpenFault = (f) => !CLOSED.includes(String(f?.status || '').toLowerCase());

// 0 = Reported, 1 = On process, 2 = Done
const stepOf = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('progress') || s.includes('process')) return 1;
  if (CLOSED.some((c) => s.includes(c))) return 2;
  return 0;
};

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtDate = (d) => {
  const date = new Date(`${String(d || '').substring(0, 10)}T00:00:00`);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtTime = (t) => {
  const [h, m] = String(t || '').split(':');
  const hour = parseInt(h, 10);
  return isNaN(hour) ? '' : `${hour % 12 || 12}:${(m || '00').padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const prioClass = (p) => ({ CRITICAL: 'crit', HIGH: 'high', MEDIUM: 'med' }[String(p || '').toUpperCase()] || 'low');
const statusClass = (s) => ({ approved: 'green', rejected: 'red' }[String(s || '').toLowerCase()] || 'amber');

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// Keeps the title (Prof./Dr./Mr. ...) only if it was typed in the name.
// "Prof. Hiruni Perera" -> "Prof. Hiruni" | "Madunika Thathsarani" -> "Madunika"
const greetName = (name = '') => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const hasTitle = /^(prof|dr|mr|mrs|ms|miss|rev)\.?$/i.test(parts[0]);
  return hasTitle ? parts.slice(0, 2).join(' ') : parts[0];
};
/* ---------- Charts (plain SVG, no extra library) ---------- */

const BarChart = ({ data, color = '#a31f2c' }) => {
  const W = 520, H = 230, L = 34, R = 10, T = 16, B = 30;
  const plotW = W - L - R;
  const plotH = H - T - B;
  const peak = Math.max(1, ...data.map((d) => d.value));
  const step = Math.max(1, Math.ceil(peak / 4));
  const top = step * 4;
  const slot = plotW / data.length;
  const bw = Math.min(46, slot * 0.55);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Fault tickets per month" className="db-svg">
      {[0, 1, 2, 3, 4].map((i) => {
        const y = T + plotH - (plotH * i) / 4;
        return (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y} y2={y} stroke="#eceef4" />
            <text x={L - 8} y={y} dy=".35em" textAnchor="end" className="db-axis">{step * i}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (plotH * d.value) / top;
        const x = L + slot * i + (slot - bw) / 2;
        const y = T + plotH - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={bw} height={Math.max(h, d.value ? 2 : 0)} rx="6" fill={color} opacity={d.value ? 1 : 0.15}>
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            {d.value > 0 && <text x={x + bw / 2} y={y - 6} textAnchor="middle" className="db-val">{d.value}</text>}
            <text x={x + bw / 2} y={H - 9} textAnchor="middle" className="db-axis">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

const Donut = ({ segments, centerLabel }) => {
  const R = 54;
  const C = 2 * Math.PI * R;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;

  return (
    <div className="db-donut">
      <svg viewBox="0 0 150 150" role="img" aria-label={centerLabel} className="db-donut-svg">
        <circle cx="75" cy="75" r={R} fill="none" stroke="#eef0f5" strokeWidth="18" />
        {total > 0 &&
          segments.map((s) => {
            const len = (s.value / total) * C;
            const el = (
              <circle
                key={s.label}
                cx="75" cy="75" r={R} fill="none" stroke={s.color} strokeWidth="18"
                strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc}
                transform="rotate(-90 75 75)"
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            );
            acc += len;
            return el;
          })}
        <text x="75" y="72" textAnchor="middle" className="db-donut-n">{total}</text>
        <text x="75" y="92" textAnchor="middle" className="db-axis">{centerLabel}</text>
      </svg>

      <ul className="db-legend">
        {segments.map((s) => (
          <li key={s.label}>
            <i style={{ background: s.color }} />
            <span>{s.label}</span>
            <b>{s.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ---------- Styles ---------- */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&display=swap');

.db { --maroon:#a31f2c; --maroon-d:#7d1420; --gold:#f5ab16; --ink:#1f2433; --muted:#7b8194; --bg:#f4f6f9; --line:#e8eaf0;
  max-width:1280px; margin:0 auto; padding:24px 24px 48px; color:var(--ink); font-family:'Inter','Segoe UI',system-ui,sans-serif; }
.db * { box-sizing:border-box; }
.db button:focus-visible { outline:2px solid var(--gold); outline-offset:2px; }

/* greeting */
.db-hello { display:flex; align-items:flex-end; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:20px; }
.db-hello h2 { margin:0; font-size:26px; font-weight:400; }
.db-hello h2 strong { font-weight:700; }
.db-hello p { margin:6px 0 0; color:var(--muted); font-size:14px; }
.db-chip { padding:6px 14px; border-radius:999px; background:#fbeaea; color:var(--maroon); font-size:12px; font-weight:700; text-transform:capitalize; }

/* banner */
.db-hero { position:relative; height:270px; overflow:hidden; border-radius:16px; background:#241014; box-shadow:0 10px 28px rgba(31,36,51,.14); margin-bottom:24px; }
.db-slide { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0; transform:scale(1.04); transition:opacity .9s ease, transform 6s ease; }
.db-slide.on { opacity:1; transform:scale(1); }
.db-shade { position:absolute; inset:0; background:linear-gradient(90deg, rgba(58,10,16,.88) 0%, rgba(58,10,16,.5) 55%, rgba(0,0,0,.1) 100%); }
.db-hero-in { position:absolute; inset:0; display:flex; align-items:center; padding:0 40px; }
.db-hero-copy { max-width:560px; }
.db-eyebrow { display:inline-block; margin-bottom:10px; padding:4px 10px; border-left:3px solid var(--gold); background:rgba(255,255,255,.12); color:#fff; font-size:11px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; }
.db-hero h1 { margin:0 0 10px; font-family:'Oswald','Bebas Neue',Impact,sans-serif; font-weight:600; letter-spacing:.5px; color:#fff; font-size:clamp(24px,3.4vw,40px); line-height:1.1; }
.db-hero p { margin:0 0 18px; font-size:14.5px; line-height:1.6; color:rgba(255,255,255,.9); }
.db-cta { display:flex; flex-wrap:wrap; gap:10px; }
.db-btn { padding:10px 20px; border:2px solid transparent; border-radius:999px; font:inherit; font-size:13px; font-weight:700; cursor:pointer; }
.db-btn.gold { background:var(--gold); color:#2b1a00; }
.db-btn.gold:hover { filter:brightness(1.08); }
.db-btn.ghost { background:transparent; color:#fff; border-color:rgba(255,255,255,.7); }
.db-btn.ghost:hover { background:rgba(255,255,255,.14); }
.db-arrow { position:absolute; top:50%; transform:translateY(-50%); width:38px; height:38px; display:grid; place-items:center; border:1px solid rgba(255,255,255,.4); border-radius:50%; background:rgba(255,255,255,.14); color:#fff; font-size:20px; line-height:1; cursor:pointer; }
.db-arrow:hover { background:rgba(255,255,255,.3); }
.db-arrow.l { left:14px; } .db-arrow.r { right:14px; }
.db-dots { position:absolute; left:50%; bottom:14px; transform:translateX(-50%); display:flex; gap:8px; }
.db-dot { width:26px; height:4px; padding:0; border:0; border-radius:2px; background:rgba(255,255,255,.45); cursor:pointer; transition:background .2s, width .2s; }
.db-dot.on { background:var(--gold); width:38px; }

/* stat cards */
.db-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; margin-bottom:24px; }
.db-stat { display:flex; flex-direction:column; align-items:flex-start; gap:4px; padding:20px; text-align:left; font:inherit; color:var(--ink);
  background:#fff; border:0; border-top:4px solid var(--c); border-radius:12px; cursor:pointer; box-shadow:0 2px 14px rgba(31,36,51,.07); transition:transform .15s, box-shadow .15s; }
.db-stat:hover { transform:translateY(-3px); box-shadow:0 12px 28px rgba(31,36,51,.14); }
.db-ico { width:44px; height:44px; display:grid; place-items:center; margin-bottom:8px; border-radius:12px; background:var(--cb); color:var(--c); }
.db-ico svg { width:23px; height:23px; }
.db-count { font-size:32px; font-weight:700; line-height:1; }
.db-tl { font-size:14px; font-weight:600; }
.db-sub { font-size:12.5px; color:var(--muted); }
.db-go { margin-top:8px; font-size:12px; font-weight:700; color:var(--c); }

/* panels + charts */
.db-grid2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; margin-bottom:20px; }
.db-panel { background:#fff; border-radius:12px; padding:20px 22px; box-shadow:0 2px 14px rgba(31,36,51,.07); }
.db-panel-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:12px; margin-bottom:10px; border-bottom:1px solid var(--line); }
.db-panel-head h3 { margin:0; font-size:16px; color:var(--maroon-d); }
.db-panel-head small { color:var(--muted); font-size:12px; }
.db-link { border:0; background:none; padding:0; font:inherit; font-size:13px; font-weight:700; color:var(--maroon); cursor:pointer; }
.db-link:hover { text-decoration:underline; }

.db-svg { width:100%; height:auto; display:block; }
.db-axis { font-size:11px; fill:#9aa0b3; font-family:inherit; }
.db-val { font-size:11.5px; font-weight:700; fill:#1f2433; font-family:inherit; }
.db-donut { display:flex; align-items:center; gap:22px; flex-wrap:wrap; justify-content:center; padding:6px 0; }
.db-donut-svg { width:170px; height:170px; flex:none; }
.db-donut-n { font-size:28px; font-weight:700; fill:#1f2433; font-family:inherit; }
.db-legend { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; min-width:170px; }
.db-legend li { display:flex; align-items:center; gap:10px; font-size:13.5px; color:#4b5563; }
.db-legend i { width:12px; height:12px; border-radius:4px; flex:none; }
.db-legend span { flex:1; }
.db-legend b { color:var(--ink); }

.db-labrow { display:grid; grid-template-columns:70px minmax(0,1fr) 120px; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--line); font-size:13px; }
.db-labrow:last-child { border-bottom:0; }
.db-labrow b { color:var(--maroon-d); }
.db-bar { display:flex; height:12px; overflow:hidden; border-radius:999px; background:#eef0f5; }
.db-bar span { display:block; height:100%; }
.db-bar .ok { background:#16a34a; } .db-bar .bad { background:#dc2626; }
.db-labrow em { font-style:normal; font-size:12px; color:var(--muted); text-align:right; }

/* lists */
.db-list { list-style:none; margin:0; padding:0; }
.db-item { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:12px 0; border-bottom:1px solid var(--line); }
.db-item:last-child { border-bottom:0; }
.db-item-main { min-width:0; }
.db-item-t { font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.db-item-s { margin-top:3px; font-size:12.5px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.db-empty { padding:26px 0 10px; text-align:center; font-size:14px; color:var(--muted); }
.db-pill { flex:0 0 auto; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; }
.db-pill.crit,.db-pill.red { background:#fde8e8; color:#c81e1e; }
.db-pill.high { background:#ffedd8; color:#c2570c; }
.db-pill.med,.db-pill.amber { background:#fff4d0; color:#a16207; }
.db-pill.low,.db-pill.green { background:#e3f6ea; color:#15803d; }

@media (max-width:1100px) { .db-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } .db-grid2 { grid-template-columns:1fr; } }
@media (max-width:600px) { .db { padding:16px 14px 40px; } .db-stats { grid-template-columns:1fr; } .db-hero { height:240px; } .db-hero-in { padding:0 20px; } .db-arrow { display:none; } .db-labrow { grid-template-columns:56px minmax(0,1fr); } .db-labrow em { grid-column:1 / -1; text-align:left; } }
@media (prefers-reduced-motion:reduce) { .db * { transition:none !important; } }
`;

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const ICONS = {
  labs: <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />,
  assets: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  faults: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />,
  reservations: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
};

/* ---------- Component ---------- */

function Dashboard({ labs = [], assets = [], faults = [], reservations = [], currentUser, setActiveTab }) {
  const [idx, setIdx] = useState(0);

  // Auto-change: moves to the next banner after SLIDE_MS, forever (no pausing).
  // It restarts every time the banner changes, so clicking an arrow or a dot keeps the auto-change going.
  useEffect(() => {
    const t = setTimeout(() => setIdx((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [idx]);

  const go = (tab) => setActiveTab && setActiveTab(tab);
  const prev = () => setIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setIdx((i) => (i + 1) % SLIDES.length);

  /* ----- numbers ----- */
  const allFaults = Array.isArray(faults) ? faults : [];
  const allRes = Array.isArray(reservations) ? reservations : [];
  const openFaults = allFaults.filter(isOpenFault);
  const pendingRes = allRes.filter((r) => String(r.status || 'Pending').toLowerCase() === 'pending');
  const today = localDate();

  const labName = (r) => {
    const id = r.labId ?? r.labID ?? r.lab?.labId ?? r.lab?.id;
    const l = (labs || []).find((x) => String(x.labId || x.id || x.labID) === String(id));
    return l ? l.labName || l.name || l.labCode : r.lab?.labName || r.labName || '';
  };

  const recentFaults = [...openFaults]
    .sort((a, b) => Number(b.reportID || b.reportId || b.id || 0) - Number(a.reportID || a.reportId || a.id || 0))
    .slice(0, 4);

  const upcoming = allRes
    .filter((r) => !['rejected', 'released', 'withdrawn'].includes(String(r.status || '').toLowerCase()) && String(r.reservationDate || r.date || '').substring(0, 10) >= today)
    .sort((a, b) => String(a.reservationDate || a.date).localeCompare(String(b.reservationDate || b.date)))
    .slice(0, 4);

  /* ----- chart data ----- */
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-GB', { month: 'short' }) };
  });
  const faultsByMonth = months.map((m) => ({
    label: m.label,
    value: allFaults.filter((f) => String(f.reportDate || f.date || f.createdAt || f.created_at || '').substring(0, 7) === m.key).length,
  }));

  const faultStatus = [
    { label: 'Reported', color: '#f5ab16', value: allFaults.filter((f) => stepOf(f.status) === 0).length },
    { label: 'On process', color: '#12bfb6', value: allFaults.filter((f) => stepOf(f.status) === 1).length },
    { label: 'Done', color: '#16a34a', value: allFaults.filter((f) => stepOf(f.status) === 2).length },
  ];

  const resStatus = [
    { label: 'Approved', color: '#16a34a', value: allRes.filter((r) => String(r.status || '').toLowerCase() === 'approved').length },
    { label: 'Pending', color: '#f5ab16', value: pendingRes.length },
    { label: 'Rejected', color: '#dc2626', value: allRes.filter((r) => String(r.status || '').toLowerCase() === 'rejected').length },
  ];

  const labHealth = (labs || []).map((lab) => {
    const id = getLabId(lab);
    const pcs = (assets || []).filter((a) => String(getAssetLabId(a)) === String(id));
    const bad = pcs.filter((a) => getActiveFaultsForAsset(a, allFaults, { labs, assets }).length > 0).length;
    return { name: getLabName(lab) || `Lab ${id}`, total: pcs.length, bad };
  });

  const tiles = [
    { tab: 'labs', label: 'Computer Labs', value: labs?.length || 0, sub: 'Published laboratories', c: '#a31f2c', cb: '#fbe9ea' },
    { tab: 'assets', label: 'Computers', value: assets?.length || 0, sub: 'Registered workstations', c: '#0f9d94', cb: '#dcf5f2' },
    { tab: 'faults', label: 'Fault Tickets', value: allFaults.length, sub: `${openFaults.length} open`, c: '#e5484d', cb: '#fde8e8' },
    { tab: 'reservations', label: 'Reservations', value: allRes.length, sub: `${pendingRes.length} pending approval`, c: '#d98a00', cb: '#fff1cf' },
  ];

const who = greetName(currentUser?.fullName || currentUser?.name || currentUser?.username);

  return (
    <div className="db">
      <style>{css}</style>

      {/* ---------- Greeting ---------- */}
      <div className="db-hello">
        <div>
          <h2>{greeting()}{who ? ', ' : ''}<strong>{who}</strong></h2>
          <p>Here is what is happening in the labs today.</p>
        </div>
        {currentUser?.role && <span className="db-chip">{currentUser.role}</span>}
      </div>

      {/* ---------- Banner ---------- */}
      <section className="db-hero" aria-roledescription="carousel" aria-label="Department banners">
        {SLIDES.map((s, i) => (
          <img key={i} src={s.img} alt="" className={`db-slide ${i === idx ? 'on' : ''}`} aria-hidden={i !== idx} />
        ))}
        <div className="db-shade" />
        <div className="db-hero-in">
          <div className="db-hero-copy" aria-live="off">
            <span className="db-eyebrow">LabSync Management Portal</span>
            <h1>{SLIDES[idx].title}</h1>
            <p>{SLIDES[idx].sub}</p>
            <div className="db-cta">
              <button type="button" className="db-btn gold" onClick={() => go('labs')}>Explore Labs</button>
              <button type="button" className="db-btn ghost" onClick={() => go('reservations')}>Reserve a Lab</button>
            </div>
          </div>
        </div>
        <button type="button" className="db-arrow l" onClick={prev} aria-label="Previous banner">‹</button>
        <button type="button" className="db-arrow r" onClick={next} aria-label="Next banner">›</button>
        <div className="db-dots">
          {SLIDES.map((_, i) => (
            <button key={i} type="button" className={`db-dot ${i === idx ? 'on' : ''}`}
              onClick={() => setIdx(i)} aria-label={`Show banner ${i + 1}`} aria-current={i === idx} />
          ))}
        </div>
      </section>

      {/* ---------- Stat cards ---------- */}
      <div className="db-stats">
        {tiles.map((t) => (
          <button key={t.tab} type="button" className="db-stat" style={{ '--c': t.c, '--cb': t.cb }} onClick={() => go(t.tab)}>
            <span className="db-ico"><svg viewBox="0 0 24 24" {...stroke} aria-hidden>{ICONS[t.tab]}</svg></span>
            <span className="db-count">{t.value}</span>
            <span className="db-tl">{t.label}</span>
            <span className="db-sub">{t.sub}</span>
            <span className="db-go">View all →</span>
          </button>
        ))}
      </div>

      {/* ---------- Charts row 1 ---------- */}
      <div className="db-grid2">
        <div className="db-panel">
          <div className="db-panel-head">
            <h3>Fault tickets per month</h3>
            <small>Last 6 months</small>
          </div>
          <BarChart data={faultsByMonth} />
        </div>

        <div className="db-panel">
          <div className="db-panel-head">
            <h3>Fault ticket status</h3>
            <button type="button" className="db-link" onClick={() => go('faults')}>View all</button>
          </div>
          <Donut segments={faultStatus} centerLabel="tickets" />
        </div>
      </div>

      {/* ---------- Charts row 2 ---------- */}
      <div className="db-grid2">
        <div className="db-panel">
          <div className="db-panel-head">
            <h3>Computer health by lab</h3>
            <button type="button" className="db-link" onClick={() => go('assets')}>View computers</button>
          </div>
          {labHealth.length === 0 ? (
            <div className="db-empty">No labs found.</div>
          ) : (
            labHealth.map((l) => {
              const okPct = l.total ? ((l.total - l.bad) / l.total) * 100 : 0;
              const badPct = l.total ? (l.bad / l.total) * 100 : 0;
              return (
                <div className="db-labrow" key={l.name}>
                  <b>{l.name}</b>
                  <div className="db-bar" aria-hidden="true">
                    <span className="ok" style={{ width: `${okPct}%` }} />
                    <span className="bad" style={{ width: `${badPct}%` }} />
                  </div>
                  <em>{l.total ? `${l.total - l.bad} of ${l.total} working` : 'No computers added'}</em>
                </div>
              );
            })
          )}
        </div>

        <div className="db-panel">
          <div className="db-panel-head">
            <h3>Reservation status</h3>
            <button type="button" className="db-link" onClick={() => go('reservations')}>View all</button>
          </div>
          <Donut segments={resStatus} centerLabel="requests" />
        </div>
      </div>

      {/* ---------- Lists ---------- */}
      <div className="db-grid2">
        <div className="db-panel">
          <div className="db-panel-head">
            <h3>Open fault tickets</h3>
            <button type="button" className="db-link" onClick={() => go('faults')}>View all</button>
          </div>
          {recentFaults.length === 0 ? (
            <div className="db-empty">No open fault tickets. All systems running.</div>
          ) : (
            <ul className="db-list">
              {recentFaults.map((f, i) => {
                const id = f.reportID || f.reportId || f.id || i + 1;
                const pc = f.computerNo || f.asset?.computerNo;
                // Lab equipment faults (AC, projector...) show the equipment name instead of a PC number
                const item = f.equipmentType ? f.equipmentType : pc ? `PC ${pc}` : '';
                const prio = String(f.priority || f.priorityLevel || 'Medium');
                return (
                  <li key={`${id}-${i}`} className="db-item">
                    <div className="db-item-main">
                      <div className="db-item-t">TKT-{id}{item ? ` · ${item}` : ''}</div>
                      <div className="db-item-s">{f.issueDescription || f.description || 'No description'}</div>
                    </div>
                    <span className={`db-pill ${prioClass(prio)}`}>{prio.toUpperCase()}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="db-panel">
          <div className="db-panel-head">
            <h3>Upcoming reservations</h3>
            <button type="button" className="db-link" onClick={() => go('reservations')}>View all</button>
          </div>
          {upcoming.length === 0 ? (
            <div className="db-empty">No upcoming reservations.</div>
          ) : (
            <ul className="db-list">
              {upcoming.map((r, i) => {
                const status = r.status || 'Pending';
                return (
                  <li key={`${r.reservationId || r.id || i}-${i}`} className="db-item">
                    <div className="db-item-main">
                      <div className="db-item-t">{r.purpose || 'Lab session'}{labName(r) ? ` · ${labName(r)}` : ''}</div>
                      <div className="db-item-s">
                        {fmtDate(r.reservationDate || r.date)} · {fmtTime(r.startTime)} – {fmtTime(r.endTime)}
                      </div>
                    </div>
                    <span className={`db-pill ${statusClass(status)}`}>{status}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;