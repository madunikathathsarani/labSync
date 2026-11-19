import React, { useState, useEffect } from 'react';
import logoImg from './logo.png';
import { logActivity, setActor } from './activityApi';

/* ---------- Helpers ---------- */

// "Dr. Madunika Thathsarani" -> "MT"
const initialsOf = (name) =>
  String(name || '?')
    .replace(/^(dr|mr|ms|mrs|prof)\.?\s+/i, '')
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const SIDE_FULL = '248px';
const SIDE_MINI = '76px';

const ICONS = {
  home: <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  labs: <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />,
  assets: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  faults: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />,
  reservations: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.6A6.5 6.5 0 0 1 21.5 20" /></>,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  bell: <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  logout: <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9" />,
  collapse: <path d="M15 6l-6 6 6 6" />,
  expand: <path d="M9 6l6 6-6 6" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
};

const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICONS[name]}
  </svg>
);

const LAB_LINKS = [
  { label: 'CC1 Laboratory', value: 'CC1 Lab' },
  { label: 'CC2 Laboratory', value: 'CC2 Lab' },
  { label: 'A5 Laboratory', value: 'A5 Lab' },
];

const PAGE_TITLES = {
  home: 'Dashboard',
  labs: 'Labs',
  assets: 'Computers',
  faults: 'Fault Tickets',
  reservations: 'Reservations',
  users: 'Users',
  activity: 'Activity Log',
};

const QUICK_LINKS = [
  { label: 'SUSL website', href: 'https://www.sab.ac.lk' },
  { label: 'VLE', href: 'https://vle.sab.ac.lk' },
  { label: 'Exam VLE', href: 'https://exam.ssl.sab.ac.lk/' },
];

/* ---------- Styles ---------- */

const css = `
.ls { --maroon:#a31f2c; --maroon-d:#7d1420; --gold:#f5ab16; font-family:'Inter','Segoe UI',system-ui,sans-serif; }
.ls * { box-sizing:border-box; }
.ls button { font:inherit; }
.ls button:focus-visible, .ls a:focus-visible { outline:2px solid var(--gold); outline-offset:2px; }

/* ---- sidebar ---- */
.ls-side { position:fixed; top:0; bottom:0; left:0; width:var(--ls-side, ${SIDE_FULL}); z-index:1100; display:flex; flex-direction:column;
  background:linear-gradient(180deg,#7d1420 0%,#5a0f19 100%); color:#fff; transition:width .2s ease, transform .2s ease; box-shadow:2px 0 14px rgba(0,0,0,.12); }
.ls-brand { display:flex; align-items:center; gap:12px; min-height:64px; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,.12); }
.ls-brand img { height:38px; width:38px; object-fit:contain; flex:none; background:#fff; border-radius:50%; padding:2px; }
.ls-brand-text { min-width:0; }
.ls-brand-text b { display:block; font-size:16px; letter-spacing:.3px; }
.ls-brand-text small { display:block; font-size:10.5px; opacity:.75; line-height:1.3; }

.ls-nav { flex:1; overflow-y:auto; padding:10px 10px 14px; }
.ls-group { margin:16px 12px 6px; font-size:10.5px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:rgba(255,255,255,.5); }
.ls-item { position:relative; display:flex; align-items:center; gap:12px; width:100%; margin-bottom:2px; padding:11px 12px; border:0; border-radius:10px;
  background:transparent; color:rgba(255,255,255,.82); font-size:13.5px; font-weight:600; text-align:left; cursor:pointer; transition:background .15s, color .15s; }
.ls-item:hover { background:rgba(255,255,255,.1); color:#fff; }
.ls-item.active { background:rgba(245,171,22,.2); color:#fff; }
.ls-item.active::before { content:''; position:absolute; left:-10px; top:8px; bottom:8px; width:4px; border-radius:0 4px 4px 0; background:var(--gold); }
.ls-item svg { width:20px; height:20px; flex:none; }
.ls-label { flex:1; white-space:nowrap; }
.ls-badge { min-width:20px; height:20px; padding:0 6px; display:grid; place-items:center; border-radius:999px; background:var(--gold); color:#2b1a00; font-size:11px; font-weight:800; }
.ls-chev { width:16px !important; height:16px !important; transition:transform .2s; opacity:.7; }
.ls-chev.open { transform:rotate(90deg); }
.ls-sub { margin:2px 0 6px 30px; padding-left:12px; border-left:1px solid rgba(255,255,255,.18); }
.ls-subitem { display:block; width:100%; padding:8px 10px; border:0; border-radius:8px; background:transparent; color:rgba(255,255,255,.75);
  font-size:12.5px; font-weight:600; text-align:left; cursor:pointer; }
.ls-subitem:hover { color:#fff; background:rgba(255,255,255,.08); }
.ls-subitem.active { color:var(--gold); }

.ls-foot { padding:12px; border-top:1px solid rgba(255,255,255,.12); }
.ls-user { display:flex; align-items:center; gap:10px; margin-bottom:10px; padding:8px; border-radius:10px; background:rgba(255,255,255,.08); }
.ls-avatar { width:36px; height:36px; flex:none; display:grid; place-items:center; border-radius:50%; background:#fff; color:var(--maroon); font-size:13px; font-weight:800; }
.ls-user-text { min-width:0; }
.ls-user-text b { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }
.ls-user-text small { font-size:11px; opacity:.75; text-transform:capitalize; }
.ls-foot-btns { display:flex; gap:8px; }
.ls-fbtn { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:9px 10px; border:1px solid rgba(255,255,255,.22); border-radius:10px;
  background:transparent; color:#fff; font-size:12.5px; font-weight:700; cursor:pointer; }
.ls-fbtn:hover { background:rgba(255,255,255,.12); }
.ls-fbtn svg { width:17px; height:17px; flex:none; }
.ls-fbtn.logout { background:rgba(0,0,0,.2); }
.ls-fbtn.mini { flex:0 0 40px; padding:9px 0; }

/* ---- top bar ---- */
.ls-top { position:fixed; top:0; right:0; left:var(--ls-side, ${SIDE_FULL}); height:64px; z-index:1000; display:flex; align-items:center; justify-content:space-between; gap:16px;
  padding:0 24px; background:#fff; border-bottom:3px solid var(--gold); box-shadow:0 1px 8px rgba(31,36,51,.06); transition:left .2s ease; }
.ls-top-l { display:flex; align-items:center; gap:14px; min-width:0; }
.ls-menu-btn { display:none; width:40px; height:40px; place-items:center; border:1px solid #e8eaf0; border-radius:10px; background:#fff; color:#1f2433; cursor:pointer; }
.ls-menu-btn svg { width:20px; height:20px; }
.ls-title { min-width:0; }
.ls-title h1 { margin:0; font-size:19px; font-weight:700; color:#1f2433; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ls-crumb { margin-top:2px; font-size:12px; color:#7b8194; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ls-top-r { display:flex; align-items:center; gap:12px; }
.ls-date { font-size:12.5px; color:#7b8194; white-space:nowrap; }
.ls-iconbtn { position:relative; width:40px; height:40px; display:grid; place-items:center; border:1px solid #e8eaf0; border-radius:10px; background:#fff; color:#4b5563; cursor:pointer; }
.ls-iconbtn:hover { border-color:var(--gold); background:#fffaf0; }
.ls-iconbtn svg { width:20px; height:20px; }
.ls-dot { position:absolute; top:-6px; right:-6px; min-width:19px; height:19px; padding:0 5px; display:grid; place-items:center; border-radius:999px; background:#e5484d; color:#fff; font-size:10.5px; font-weight:800; border:2px solid #fff; }
.ls-menu { position:relative; }
.ls-pop { position:absolute; right:0; top:calc(100% + 8px); min-width:190px; padding:6px; border:1px solid #e8eaf0; border-radius:12px; background:#fff; box-shadow:0 12px 30px rgba(31,36,51,.16); z-index:1200; }
.ls-pop a { display:block; padding:9px 12px; border-radius:8px; color:#1f2433; font-size:13px; font-weight:600; text-decoration:none; }
.ls-pop a:hover { background:#fbf3f4; color:var(--maroon); }
.ls-backdrop { position:fixed; inset:0; z-index:1150; background:transparent; }
.ls-chip { display:flex; align-items:center; gap:10px; padding:4px 12px 4px 4px; border:1px solid #e8eaf0; border-radius:999px; background:#fff; }
.ls-chip .ls-avatar { width:32px; height:32px; background:linear-gradient(135deg,#a31f2c,#c0504d); color:#fff; font-size:12px; }
.ls-chip-text { line-height:1.2; }
.ls-chip-text b { display:block; max-width:170px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; color:#1f2433; }
.ls-chip-text small { font-size:11px; color:#7b8194; text-transform:capitalize; }

.ls-overlay { display:none; }

/* ---- collapsed sidebar (desktop) ---- */
@media (min-width:901px) {
  .ls-side.collapsed .ls-brand-text, .ls-side.collapsed .ls-label, .ls-side.collapsed .ls-badge, .ls-side.collapsed .ls-chev,
  .ls-side.collapsed .ls-sub, .ls-side.collapsed .ls-group, .ls-side.collapsed .ls-user-text, .ls-side.collapsed .ls-fbtn span { display:none; }
  .ls-side.collapsed .ls-item { justify-content:center; padding:11px 0; }
  .ls-side.collapsed .ls-brand { justify-content:center; padding:12px 0; }
  .ls-side.collapsed .ls-user { justify-content:center; background:transparent; padding:0; }
  .ls-side.collapsed .ls-foot-btns { flex-direction:column; }
  .ls-side.collapsed .ls-fbtn { flex:none; }
}

/* ---- tablet / phone ---- */
@media (max-width:900px) {
  .ls-side { width:${SIDE_FULL}; transform:translateX(-100%); }
  .ls-side.open { transform:none; }
  .ls-top { left:0; padding:0 14px; }
  .ls-menu-btn { display:grid; }
  .ls-fbtn.mini { display:none; }
  .ls-overlay { display:block; position:fixed; inset:0; z-index:1050; background:rgba(15,23,42,.45); }
  .ls-date, .ls-chip-text { display:none; }
  .ls-chip { padding:4px; }
}
@media (prefers-reduced-motion:reduce) { .ls * { transition:none !important; } }
`;

/* ---------- Component ---------- */

function Header({
  activeTab,
  setActiveTab,
  userRole,
  currentUser,
  onLogout,
  selectedLab,
  setSelectedLab,
  openFaultsCount = 0,
  pendingReservationsCount = 0,
}) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('labsync_sidebar') === 'collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [labsOpen, setLabsOpen] = useState(activeTab === 'labs');
  const [linksOpen, setLinksOpen] = useState(false);

  const role = String(userRole || '').toLowerCase();
  const isAdmin = role === 'admin';

  // Name of the person who is logged in (a student without an account is a guest)
  const displayName =
    currentUser?.fullName ||
    currentUser?.name ||
    currentUser?.username ||
    (role === 'student' ? 'Guest student' : 'User');

  // The page content reads this variable to know how much room the sidebar takes
  useEffect(() => {
    document.documentElement.style.setProperty('--ls-side', collapsed ? SIDE_MINI : SIDE_FULL);
    localStorage.setItem('labsync_sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);
  useEffect(() => () => document.documentElement.style.removeProperty('--ls-side'), []);

  const go = (tab) => {
    if (setActiveTab) setActiveTab(tab);
    setMobileOpen(false);
  };

  const openLabs = () => {
    if (setSelectedLab) setSelectedLab('');
    go('labs');
    setLabsOpen((o) => (activeTab === 'labs' ? !o : true));
  };

  const pickLab = (value) => {
    if (setSelectedLab) setSelectedLab(value);
    go('labs');
  };

  const handleLogout = () => {
    logActivity(null, role === 'student' ? 'Guest student left the portal' : 'Signed out');
    setActor(null);
    if (onLogout) onLogout();
  };

  const main = [
    { id: 'home', label: 'Dashboard', icon: 'home' },
    { id: 'labs', label: 'Labs', icon: 'labs', sub: true },
    { id: 'assets', label: 'Computers', icon: 'assets' },
    { id: 'faults', label: 'Fault Tickets', icon: 'faults', badge: openFaultsCount },
    { id: 'reservations', label: 'Reservations', icon: 'reservations', badge: pendingReservationsCount },
  ];
  const admin = [
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'activity', label: 'Activity Log', icon: 'activity' },
  ];

  const renderItem = (it) => {
    const active = activeTab === it.id;
    return (
      <div key={it.id}>
        <button
          type="button"
          className={`ls-item ${active ? 'active' : ''}`}
          title={it.label}
          aria-current={active ? 'page' : undefined}
          onClick={it.sub ? openLabs : () => go(it.id)}
        >
          <Icon name={it.icon} />
          <span className="ls-label">{it.label}</span>
          {it.badge > 0 && <span className="ls-badge">{it.badge}</span>}
          {it.sub && (
            <svg className={`ls-chev ${labsOpen && active ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONS.chevron}
            </svg>
          )}
        </button>

        {it.sub && labsOpen && active && (
          <div className="ls-sub">
            {LAB_LINKS.map((l) => (
              <button
                key={l.value}
                type="button"
                className={`ls-subitem ${selectedLab === l.value ? 'active' : ''}`}
                onClick={() => pickLab(l.value)}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const crumbLab = activeTab === 'labs' && selectedLab && String(selectedLab).toUpperCase() !== 'ALL' ? selectedLab : '';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="ls">
      <style>{css}</style>

      {mobileOpen && <div className="ls-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />}

      {/* ---------- Sidebar ---------- */}
      <aside className={`ls-side ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="ls-brand">
          <img src={logoImg} alt="SUSL logo" />
          <div className="ls-brand-text">
            <b>LabSync</b>
            <small>Department of Information Technology</small>
          </div>
        </div>

        <nav className="ls-nav">
          <div className="ls-group">Main</div>
          {main.map(renderItem)}

          {isAdmin && (
            <>
              <div className="ls-group">Administration</div>
              {admin.map(renderItem)}
            </>
          )}
        </nav>

        <div className="ls-foot">
          <div className="ls-user" title={currentUser?.email || displayName}>
            <span className="ls-avatar">{initialsOf(displayName)}</span>
            <div className="ls-user-text">
              <b>{displayName}</b>
              <small>{role || 'guest'}</small>
            </div>
          </div>
          <div className="ls-foot-btns">
            <button type="button" className="ls-fbtn logout" onClick={handleLogout} title="Log out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS.logout}</svg>
              <span>Log out</span>
            </button>
            <button
              type="button"
              className="ls-fbtn mini"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? 'Expand menu' : 'Collapse menu'}
              aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {collapsed ? ICONS.expand : ICONS.collapse}
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- Top bar ---------- */}
      <header className="ls-top">
        <div className="ls-top-l">
          <button type="button" className="ls-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{ICONS.menu}</svg>
          </button>
          <div className="ls-title">
            <h1>{PAGE_TITLES[activeTab] || 'LabSync'}</h1>
            <div className="ls-crumb">
              LabSync / {PAGE_TITLES[activeTab] || 'Home'}{crumbLab ? ` / ${crumbLab}` : ''}
            </div>
          </div>
        </div>

        <div className="ls-top-r">
          <span className="ls-date">{today}</span>

          <div className="ls-menu">
            <button type="button" className="ls-iconbtn" onClick={() => setLinksOpen((o) => !o)} title="Quick links" aria-label="Quick links" aria-expanded={linksOpen}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS.link}</svg>
            </button>
            {linksOpen && (
              <>
                <div className="ls-backdrop" onClick={() => setLinksOpen(false)} aria-hidden="true" />
                <div className="ls-pop" role="menu">
                  {QUICK_LINKS.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noreferrer" role="menuitem" onClick={() => setLinksOpen(false)}>{l.label}</a>
                  ))}
                </div>
              </>
            )}
          </div>

          <button type="button" className="ls-iconbtn" onClick={() => go('faults')} title={`${openFaultsCount} open fault tickets`} aria-label={`${openFaultsCount} open fault tickets`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS.bell}</svg>
            {openFaultsCount > 0 && <span className="ls-dot">{openFaultsCount > 99 ? '99+' : openFaultsCount}</span>}
          </button>

          <div className="ls-chip" title={currentUser?.email || displayName}>
            <span className="ls-avatar">{initialsOf(displayName)}</span>
            <div className="ls-chip-text">
              <b>{displayName}</b>
              <small>{role || 'guest'}</small>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default Header;