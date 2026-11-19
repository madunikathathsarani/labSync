import React, { useState, useEffect, useMemo, useCallback } from 'react';

const API = 'http://localhost:8080/api';
const PAGE_SIZE = 15;

const TYPES = [
  { key: 'all', label: 'All' },
  { key: 'created', label: 'Created' },
  { key: 'updated', label: 'Updated' },
  { key: 'deleted', label: 'Deleted' },
  { key: 'signin', label: 'Sign-ins' },
  { key: 'signout', label: 'Sign-outs' },
];

const TYPE_LABEL = { created: 'Created', updated: 'Updated', deleted: 'Deleted', signin: 'Sign-in', signout: 'Sign-out', other: 'Other' };

/* Works out the kind of action from its text, e.g. "Created a fault ticket" -> created */
const typeOf = (text = '') => {
  const t = String(text).toLowerCase();
  if (t.includes('signed out') || t.includes('left the portal')) return 'signout';
  if (t.includes('sign') || t.includes('opened the portal')) return 'signin';
  if (t.startsWith('created') || t.startsWith('added') || t.startsWith('reported')) return 'created';
  if (t.startsWith('updated') || t.startsWith('changed')) return 'updated';
  if (t.startsWith('deleted') || t.startsWith('removed')) return 'deleted';
  return 'other';
};

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const when = (ts) => {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return { date: '—', time: '' };
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
};

const initials = (name = '') =>
  String(name).replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

// Finds the person behind a user ID
const who = (map, id, text = '') => {
  if (!id) {
    if (/guest/i.test(text)) return { name: 'Guest student', role: '', id: '', note: 'Not signed in' };
    if (/failed sign-in/i.test(text)) return { name: 'Unknown user', role: '', id: '', note: 'Failed attempt' };
    return { name: 'System', role: '', id: '', note: 'Automatic' };
  }
  const u = map[String(id)];
  return { name: u?.name || u?.fullName || String(id), role: u?.role || '', id: String(id) };
};

const css = `
.al{--maroon:#800000;--gold:#f5ab16;--ink:#1f2433;--muted:#7b8194;--line:#eceef4;--bg:#f7f7fb;
  font-family:'Inter','Segoe UI',system-ui,sans-serif;color:var(--ink);background:var(--bg);max-width:1200px;margin:0 auto;padding:28px 24px 48px}
.al *{box-sizing:border-box}
.al-head{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px;margin-bottom:22px}
.al-head h2{margin:0;font-size:24px;font-weight:400}.al-head h2 strong{font-weight:700}
.al-head p{margin:6px 0 0;color:var(--muted);font-size:14px}
.al-btns{display:flex;gap:8px}
.al-btn{border:1px solid var(--line);background:#fff;color:var(--maroon);padding:9px 16px;border-radius:999px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.al-btn:hover{border-color:var(--gold);background:#fffaf0}
.al-btn.solid{background:var(--maroon);border-color:var(--maroon);color:#fff}

.al-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:26px}
.al-tile{position:relative;overflow:hidden;padding:20px 22px;border-radius:6px;color:#fff;display:flex;flex-direction:column;gap:6px;box-shadow:0 8px 20px rgba(31,36,51,.12)}
.al-tile::after{content:'';position:absolute;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.14)}
.al-tile b{font-size:34px;font-weight:600;line-height:1}
.al-tile span{font-size:11px;letter-spacing:1.2px;text-transform:uppercase;opacity:.9}
.al-tile.maroon{background:linear-gradient(135deg,#800000,#b0302f)}
.al-tile.amber{background:linear-gradient(135deg,#f0b21a,#f5922a)}
.al-tile.teal{background:linear-gradient(135deg,#12bfb6,#1fd6bd)}
.al-tile.crimson{background:linear-gradient(135deg,#e5484d,#f2784b)}

.al-filters{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:16px}
.al-filters input,.al-filters select{height:40px;padding:0 14px;border:1px solid var(--line);border-radius:10px;background:#fff;font:inherit;font-size:13px;color:var(--ink);outline:0}
.al-filters input:focus,.al-filters select:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(245,171,22,.2)}
.al-search{flex:1;min-width:220px}
.al-date{display:flex;gap:6px;align-items:center}
.al-date .al-btn{height:40px;padding:0 14px}
.al-date .al-btn.on{background:var(--maroon);border-color:var(--maroon);color:#fff}
.al-tabs{display:flex;gap:4px;padding:4px;background:#e9ebf5;border-radius:999px;flex-wrap:wrap}
.al-tab{border:0;background:transparent;padding:7px 14px;border-radius:999px;font:inherit;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer}
.al-tab.on{background:#fff;color:var(--maroon);box-shadow:0 1px 4px rgba(31,36,51,.12)}

.al-wrap{overflow-x:auto;background:#f1f2f6;border-radius:6px;padding:14px 18px 10px;box-shadow:0 2px 12px rgba(31,36,51,.06)}
.al-table{min-width:860px}
.al-row{display:grid;grid-template-columns:130px 230px 100px minmax(200px,1fr) 120px;gap:14px;align-items:center;padding:0 18px}
.al-th{padding-bottom:10px;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#9aa0b3}
.al-tr{min-height:58px;margin-bottom:8px;background:#fff;border-radius:6px;font-size:13px;box-shadow:0 1px 3px rgba(31,36,51,.05)}
.al-time b{display:block;font-weight:600}.al-time span{font-size:12px;color:var(--muted)}
.al-user{display:flex;align-items:center;gap:10px;min-width:0}
.al-av{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;flex:none;font-size:11px;font-weight:700;color:#fff;background:linear-gradient(135deg,#800000,#c0504d)}
.al-user div{min-width:0}.al-user b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.al-user span{font-size:11px;color:var(--muted)}
.al-detail{color:#4a5064}
.al-ip{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:var(--muted)}
.al-pill{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700}
.al-pill.created{background:#e3f6ea;color:#15803d}.al-pill.updated{background:#dcf7f4;color:#0f766e}
.al-pill.deleted{background:#fde8e8;color:#c81e1e}.al-pill.signin{background:#e8efff;color:#3b5fc0}.al-pill.other{background:#eef0f5;color:#5d6985}.al-pill.signout{background:#f1eefb;color:#6a52b3}

.al-foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:14px;font-size:12px;color:var(--muted)}
.al-pager{display:flex;gap:8px;align-items:center}
.al-pager button{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 14px;font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.al-pager button:disabled{opacity:.45;cursor:not-allowed}
.al-alert{padding:11px 14px;border-radius:8px;margin-bottom:16px;font-size:13px;font-weight:600;background:#fdecec;color:#991b1b;border:1px solid #f5c2c2}
.al-empty{background:#fff;border:2px dashed #d9dcea;border-radius:10px;padding:40px;text-align:center;color:var(--muted);font-size:15px}
@media(max-width:700px){.al{padding:20px 14px 40px}}
`;

function ActivityLog({ userRole }) {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [day, setDay] = useState(''); // '' = all dates (use the Today button to see only today)
  const [page, setPage] = useState(1);

  // Only admins may open this page (if the role is known)
  const allowed = !userRole || String(userRole).trim().toLowerCase() === 'admin';

  const load = useCallback(async () => {
    try {
      const [l, u] = await Promise.all([fetch(`${API}/activity-logs`), fetch(`${API}/users`).catch(() => null)]);
      if (!l.ok) throw new Error(l.status);
      setLogs(await l.json());
      if (u && u.ok) setUsers(await u.json());
      setError('');
      setUpdatedAt(new Date());
    } catch (e) {
      setError('Could not load the activity log. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return undefined;
    load();
    const t = setInterval(load, 30000); // refresh every 30 seconds
    return () => clearInterval(t);
  }, [load, allowed]);

  useEffect(() => { setPage(1); }, [query, type, userFilter, day]);

  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [String(u.userId), u])), [users]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((l) => {
      if (type !== 'all' && typeOf(l.actionDetails) !== type) return false;
      if (userFilter !== 'all' && String(l.userId || '') !== userFilter) return false;
      if (day && String(l.timestamp || '').substring(0, 10) !== day) return false;
      if (!q) return true;
      const w = who(userMap, l.userId, l.actionDetails);
      return [l.actionDetails, l.userId, w.name, l.ipAddress].some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [logs, type, userFilter, day, query, userMap]);

  const today = localDate();
  const weekAgo = localDate(new Date(Date.now() - 6 * 86400000));
  const stats = {
    total: logs.length,
    today: logs.filter((l) => String(l.timestamp || '').substring(0, 10) === today).length,
    week: logs.filter((l) => String(l.timestamp || '').substring(0, 10) >= weekAgo).length,
    people: new Set(logs.map((l) => l.userId).filter(Boolean)).size,
  };

  const userOptions = [...new Set(logs.map((l) => l.userId).filter(Boolean).map(String))];
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Time', 'User ID', 'Name', 'Action', 'IP address'].join(',');
    const lines = rows.map((l) =>
      [l.timestamp, l.userId, who(userMap, l.userId, l.actionDetails).name, l.actionDetails, l.ipAddress].map(esc).join(',')
    );
    const blob = new Blob([[head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `activity-log-${day || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!allowed) {
    return (
      <div className="al"><style>{css}</style>
        <div className="al-empty">Only administrators can view the activity log.</div>
      </div>
    );
  }

  return (
    <div className="al">
      <style>{css}</style>

      <header className="al-head">
        <div>
          <h2>Activity <strong>Log</strong></h2>
          <p>
            A record of who did what in LabSync.
            {updatedAt && ` Updated ${updatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`}
          </p>
        </div>
        <div className="al-btns">
          <button type="button" className="al-btn" onClick={load}>Refresh</button>
          <button type="button" className="al-btn solid" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
        </div>
      </header>

      {error && <div className="al-alert" role="alert">{error}</div>}

      <div className="al-tiles">
        <div className="al-tile maroon"><b>{stats.total}</b><span>Total events</span></div>
        <div className="al-tile amber"><b>{stats.today}</b><span>Today</span></div>
        <div className="al-tile teal"><b>{stats.week}</b><span>Last 7 days</span></div>
        <div className="al-tile crimson"><b>{stats.people}</b><span>Users involved</span></div>
      </div>

      <div className="al-filters">
        <input className="al-search" placeholder="Search by user, action or IP" value={query}
          onChange={(e) => setQuery(e.target.value)} aria-label="Search the activity log" />
        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} aria-label="Filter by user">
          <option value="all">All users</option>
          {userOptions.map((id) => <option key={id} value={id}>{who(userMap, id).name} ({id})</option>)}
        </select>

        <div className="al-date">
          <input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} aria-label="Filter by date" />
          <button type="button" className={`al-btn ${day === today ? 'on' : ''}`} onClick={() => setDay(today)}>Today</button>
          <button type="button" className={`al-btn ${day === '' ? 'on' : ''}`} onClick={() => setDay('')}>All dates</button>
        </div>

        <div className="al-tabs" role="tablist">
          {TYPES.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={type === t.key}
              className={`al-tab ${type === t.key ? 'on' : ''}`} onClick={() => setType(t.key)}>{t.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="al-empty">Loading activity...</div>
      ) : rows.length === 0 ? (
        <div className="al-empty">
          {logs.length === 0
            ? 'No activity has been recorded yet.'
            : day === today && !query && type === 'all' && userFilter === 'all'
              ? 'No activity recorded today yet. Click "All dates" to see earlier activity.'
              : 'No activity matches your filters.'}
        </div>
      ) : (
        <>
          <div className="al-wrap">
            <div className="al-table">
              <div className="al-row al-th">
                <span>Time</span><span>User</span><span>Type</span><span>Action</span><span>IP address</span>
              </div>
              {shown.map((l, i) => {
                const w = who(userMap, l.userId, l.actionDetails);
                const t = typeOf(l.actionDetails);
                const d = when(l.timestamp);
                return (
                  <div key={l.logId ?? `${l.timestamp}-${i}`} className="al-row al-tr">
                    <span className="al-time"><b>{d.date}</b><span>{d.time}</span></span>
                    <span className="al-user">
                      <i className="al-av">{initials(w.name)}</i>
                      <div><b>{w.name}</b><span>{[w.id, w.role].filter(Boolean).join(' · ') || w.note || 'Automatic'}</span></div>
                    </span>
                    <span><b className={`al-pill ${t}`}>{TYPE_LABEL[t]}</b></span>
                    <span className="al-detail">{l.actionDetails}</span>
                    <span className="al-ip">{l.ipAddress || '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="al-foot">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length} events</span>
            <div className="al-pager">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span>Page {page} of {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ActivityLog;