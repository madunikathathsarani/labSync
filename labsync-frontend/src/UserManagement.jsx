import React, { useState, useEffect, useMemo, useRef } from 'react';

const ROLES = {
  Admin:      { prefix: 'A', color: '#4a80f0', soft: '#e8efff', icon: '🛡️' },
  Lecturer:   { prefix: 'L', color: '#f2b81c', soft: '#fff6d9', icon: '🎓' },
  Technician: { prefix: 'T', color: '#e5564f', soft: '#ffe9e8', icon: '🔧' },
};

const emptyUser = {
  userId: '', fullName: '', email: '', password: '',
  role: 'Lecturer', contactNo: '', mustChangePassword: true,
};
const API = 'http://localhost:8080/api/users';

// Backend uses "name", this page uses "fullName"
const fromApi = (u) => ({
 userId: u.userId ?? u.userID ?? u.id,
  fullName: u.fullName ?? u.name ?? '',
  email: u.email || '',
  role: Object.keys(ROLES).find((r) => r.toLowerCase() === String(u.role || '').toLowerCase()) || u.role || '',
  contactNo: u.contactNo || '',
  mustChangePassword: !!u.mustChangePassword,
});

const toApi = (u) => {
  const body = {
    userId: u.userId ?? u.userID ?? u.id,
    name: u.fullName,
    email: u.email,
    role: u.role,
    contactNo: u.contactNo || '',
  };
  // Send the password ONLY when the admin typed a new one
  if (u.password) body.password = u.password;
  if (u.mustChangePassword !== undefined) body.mustChangePassword = u.mustChangePassword;
  return body;
};

// Sends a request to the backend and returns { ok, text }
const callApi = async (url, options = {}) => {
  try {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (res.ok) return { ok: true };
    const t = await res.text();
    return { ok: false, text: t && !t.trim().startsWith('{') ? t : `Server error ${res.status}` };
  } catch (e) {
    return { ok: false, text: 'Could not reach the server. Is the backend running?' };
  }
};
// Random temporary password for the admin to hand out. The user replaces it at first sign-in.
const generateTempPassword = (length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

.um { --blue:#4a80f0; --ink:#1f2a44; --muted:#9aa4b8; --line:#eef1f7; --bg:#eef2f8;
  font-family:'Poppins',system-ui,sans-serif; color:var(--ink); background:var(--bg);
  padding:24px; border-radius:24px; display:grid; grid-template-columns:minmax(0,1fr) 280px; gap:20px; }
.um * { box-sizing:border-box; }
.um-main { display:flex; flex-direction:column; gap:20px; min-width:0; }
.um-card { background:#fff; border-radius:16px; padding:20px; scroll-margin-top:12px; }
.um-title { margin:0 0 14px; font-size:16px; font-weight:600; display:flex; align-items:center; gap:10px; }
.um-sub { font-size:12px; color:var(--muted); font-weight:400; }
.um-chip { font-size:11px; font-weight:600; padding:3px 10px; border-radius:99px; background:#fff6d9; color:#b7860b; }

.um-search { display:flex; align-items:center; gap:10px; background:#fff; border-radius:12px; padding:0 16px; height:46px; }
.um-search input { flex:1; border:0; outline:0; font:inherit; font-size:13px; background:transparent; }

.um-roles { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.um-role { text-align:left; border:0; font:inherit; cursor:pointer; background:#fff; border-radius:16px; padding:18px;
  display:flex; flex-direction:column; gap:14px; transition:background .15s, box-shadow .15s; }
.um-role:hover { box-shadow:0 6px 18px rgba(74,128,240,.12); }
.um-role:focus-visible, .um-btn:focus-visible, .um tbody tr:focus-visible { outline:2px solid var(--blue); outline-offset:2px; }
.um-role.active { background:var(--blue); color:#fff; box-shadow:0 10px 24px rgba(74,128,240,.35); }
.um-role-top { display:flex; align-items:center; gap:12px; }
.um-ico { width:42px; height:42px; border-radius:12px; display:grid; place-items:center; font-size:20px; flex:none; }
.um-role-name { font-weight:600; font-size:14px; }
.um-role-row { display:flex; justify-content:space-between; font-size:12px; opacity:.85; margin-bottom:6px; }
.um-bar { height:5px; border-radius:99px; background:rgba(154,164,184,.25); overflow:hidden; }
.um-role.active .um-bar { background:rgba(255,255,255,.3); }
.um-bar > i { display:block; height:100%; border-radius:99px; }

.um-form { display:grid; grid-template-columns:1fr 1fr; gap:14px 16px; }
.um-field { min-width:0; }
.um-field.full { grid-column:span 2; }
.um-field label { display:block; font-size:12px; font-weight:500; color:#5d6985; margin-bottom:6px; }
.um-field input, .um-field select { width:100%; height:42px; padding:0 14px; font:inherit; font-size:13px; color:var(--ink);
  border:1.5px solid var(--line); background:#f8faff; border-radius:10px; outline:0; transition:border-color .15s, background .15s; }
.um-field input:focus, .um-field select:focus { border-color:var(--blue); background:#fff; }
.um-field input.err { border-color:#e5564f; background:#fff8f8; }
.um-field input[readonly], .um-field select:disabled { background:#eef2fb; font-weight:600; color:var(--blue); cursor:not-allowed; }
.um-hint { display:block; margin-top:5px; font-size:11px; color:#e5564f; font-weight:500; }
.um-note { display:block; margin-top:5px; font-size:11px; color:var(--muted); }
.um-pw-row { display:flex; gap:8px; }
.um-mini { flex:none; height:42px; padding:0 12px; border:1.5px solid var(--line); background:#fff; border-radius:10px;
  font:inherit; font-size:12px; font-weight:500; color:#5d6985; cursor:pointer; }
.um-mini:hover { border-color:var(--blue); color:var(--blue); }


.um-actions { grid-column:span 2; display:flex; gap:10px; margin-top:4px; }
.um-btn { flex:1; height:44px; border:0; border-radius:10px; background:var(--blue); color:#fff; font:inherit;
  font-size:14px; font-weight:600; cursor:pointer; transition:background .15s; }
.um-btn.main { flex:2; }
.um-btn:hover { background:#3b6fe0; }
.um-btn.ghost { background:#eef2fb; color:#5d6985; }
.um-btn.ghost:hover { background:#e1e8f7; }
.um-btn.danger { background:#fff; color:#c2352e; border:1.5px solid #f3b9b6; }
.um-btn.danger:hover { background:#ffe9e8; }
.um-btn.danger-solid { background:#d6423a; } .um-btn.danger-solid:hover { background:#bd352e; }

.um-alert { padding:11px 14px; border-radius:10px; font-size:13px; font-weight:500; margin-bottom:14px; }
.um-alert.bad { background:#ffe9e8; color:#c2352e; }
.um-alert.ok  { background:#e3f6ea; color:#1f8a4c; }
.um-confirm { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  background:#fff1f0; color:#c2352e; border-radius:10px; padding:12px 14px; margin-bottom:14px; font-size:13px; font-weight:500; }
.um-confirm .um-btn { flex:none; height:34px; padding:0 14px; font-size:12px; }

.um-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.um-head a { font-size:12px; color:var(--blue); font-weight:500; }
.um-scroll { overflow-x:auto; }
.um table { width:100%; border-collapse:collapse; font-size:13px; min-width:640px; }
.um th { text-align:left; font-weight:500; font-size:12px; color:var(--muted); padding:12px 10px; }
.um td { padding:12px 10px; border-top:1px solid var(--line); color:#5d6985; }
.um tbody tr { cursor:pointer; }
.um tbody tr:hover { background:#f8faff; }
.um tbody tr.sel { background:#eaf0ff; box-shadow:inset 3px 0 0 var(--blue); }
.um-user { display:flex; align-items:center; gap:12px; color:var(--ink); font-weight:500; }
.um-av { width:34px; height:34px; border-radius:10px; display:grid; place-items:center; font-size:12px; font-weight:600; flex:none; }
.um-id { font-weight:600; color:var(--ink); }
.um-pill { display:inline-block; padding:3px 10px; border-radius:99px; font-size:11px; font-weight:600; white-space:nowrap; }
.um-empty { text-align:center; padding:28px 0 !important; color:var(--muted) !important; }
.um-tablehint { margin:0 0 4px; font-size:12px; color:var(--muted); }

.um-side { background:#fff; border-radius:20px; padding:22px; display:flex; flex-direction:column; gap:20px; align-self:start; }
.um-total { display:flex; align-items:baseline; gap:8px; }
.um-total b { font-size:28px; font-weight:700; color:var(--blue); }
.um-total span { font-size:14px; color:var(--muted); }
.um-seg { display:flex; height:6px; border-radius:99px; overflow:hidden; background:#eef1f7; margin-top:10px; }
.um-seg i { display:block; height:100%; }
.um-list { display:flex; flex-direction:column; gap:16px; }
.um-li { display:flex; align-items:center; gap:12px; }
.um-li .um-ico { width:36px; height:36px; font-size:16px; }
.um-li-name { font-size:13px; font-weight:500; }
.um-li-n { margin-left:auto; font-size:13px; font-weight:600; color:var(--blue); }
.um-tip { border:1.5px dashed #d5dcea; border-radius:14px; padding:16px; text-align:center; font-size:12px; color:var(--muted); line-height:1.6; }
.um-tip b { display:block; color:var(--ink); font-size:13px; margin-bottom:4px; }

@media (max-width: 1100px) { .um { grid-template-columns:1fr; } }
@media (max-width: 700px)  {
  .um-roles, .um-form { grid-template-columns:1fr; }
  .um-field.full, .um-actions { grid-column:span 1; }
  .um-actions { flex-wrap:wrap; }
}
`;

function UserManagement({ currentUserId, onUsersUpdated }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyUser);
  const [selectedId, setSelectedId] = useState(null); // null = "add" mode
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null); // { type: 'ok' | 'bad', text }
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const formRef = useRef(null);

  const isEdit = selectedId !== null;

   const loadUsers = async () => {
  try {
    const res = await fetch(API);

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();

    const updatedUsers = data.map(fromApi);

    setUsers(updatedUsers);

    // Send updated users to App.js
    if (onUsersUpdated) {
      onUsersUpdated();
    }

  } catch (err) {
    console.error('Error loading users:', err);

    setBanner({
      type: 'bad',
      text: 'Could not load users from the server.'
    });
  }
};

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-generate the next User ID (add mode only; an existing ID never changes)
  useEffect(() => {
    if (isEdit) return;
    const prefix = ROLES[form.role]?.prefix;
    if (!prefix) return;
    const nums = users
      .filter((u) => u.role === form.role && u.userId?.startsWith(prefix))
      .map((u) => parseInt(u.userId.replace(prefix, ''), 10))
      .filter((n) => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    setForm((prev) => ({ ...prev, userId: `${prefix}${String(next).padStart(3, '0')}` }));
  }, [form.role, users, isEdit]);


  const counts = useMemo(() => {
    const c = { Admin: 0, Lecturer: 0, Technician: 0 };
    users.forEach((u) => { if (c[u.role] !== undefined) c[u.role]++; });
    return c;
  }, [users]);

  /* ---------- form helpers ---------- */

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => { const { [name]: _drop, ...rest } = prev; return rest; });
  };

  const resetForm = (role = 'Lecturer') => {
    setSelectedId(null);
    setForm({ ...emptyUser, role });
    setErrors({});
    setBanner(null);
    setConfirmDelete(false);
    setShowPw(false);
  };

  const handleContactChange = (e) => {
    const value = e.target.value;
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length <= 10) setForm((prev) => ({ ...prev, contactNo: digits }));
    setErrors((prev) => {
      const { contactNo: _drop, ...rest } = prev;
      return /[^0-9]/.test(value) ? { ...rest, contactNo: 'Numbers only. Letters and symbols are not allowed.' } : rest;
    });
  };

  const validate = () => {
    const e = {};
    const name = form.fullName.trim();
    const email = form.email.trim().toLowerCase();

    if (name.length < 3) e.fullName = 'Enter at least 3 characters.';
    else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) e.fullName = "Use letters, spaces and . ' - only.";

    if (!/^[a-zA-Z0-9._%+-]+@(gmail\.com|sab\.ac\.lk)$/.test(email)) {
      e.email = 'Use an address ending in @gmail.com or @sab.ac.lk.';
    } else if (users.some((u) => u.userId !== form.userId && String(u.email || '').toLowerCase() === email)) {
      e.email = 'This email is already used by another account.';
    }

    if (form.contactNo && !/^0\d{9}$/.test(form.contactNo)) {
      e.contactNo = 'Enter 10 digits starting with 0, e.g. 0712345678.';
    }

    // The admin only sets a temporary password. The strong password is created by the user at first sign-in.
    const pw = form.password;
    if (!isEdit || pw) {
      if (pw.length < 6) e.password = 'Enter a temporary password of at least 6 characters.';
      else if (/\s/.test(pw)) e.password = 'The password cannot contain spaces.';
    }
    return e;
  };

  /* ---------- CRUD ---------- */

   const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    setErrors(errs);
    setBanner(null);
    setConfirmDelete(false);
    if (Object.keys(errs).length) {
      setBanner({ type: 'bad', text: 'Please fix the highlighted fields.' });
      return;
    }

    const clean = { ...form, fullName: form.fullName.trim(), email: form.email.trim().toLowerCase() };

    if (isEdit) {
      // A new password entered by the admin becomes a temporary one the user must replace.
const payload = toApi({ ...clean, mustChangePassword: form.password ? true : form.mustChangePassword });
      const r = await callApi(`${API}/${selectedId}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!r.ok) { setBanner({ type: 'bad', text: r.text }); return; }
      await loadUsers();
      resetForm();
      setBanner({ type: 'ok', text: `${clean.fullName} (${clean.userId}) was updated.` });
    } else {
      const r = await callApi(API, { method: 'POST', body: JSON.stringify(toApi({ ...clean, mustChangePassword: true })) });
      if (!r.ok) { setBanner({ type: 'bad', text: r.text }); return; }
      await loadUsers();
      resetForm(form.role);
      setBanner({
        type: 'ok',
        text: `${clean.fullName} (${clean.userId}) was added. They must set their own password at first sign-in.`,
      });
    }
  };

  const handleSelect = (u) => {
    setSelectedId(u.userId);
    setForm({ ...emptyUser, ...u, password: '' });
    setErrors({});
    setBanner(null);
    setConfirmDelete(false);
    setShowPw(false);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

   const handleDelete = async () => {
    const target = users.find((u) => u.userId === selectedId);
    setConfirmDelete(false);
    if (!target) return;
    if (currentUserId && target.userId === currentUserId) {
      setBanner({ type: 'bad', text: 'You cannot delete the account you are signed in with.' });
      return;
    }
    if (target.role === 'Admin' && counts.Admin <= 1) {
      setBanner({ type: 'bad', text: 'You cannot delete the last Admin account.' });
      return;
    }
    const r = await callApi(`${API}/${selectedId}`, { method: 'DELETE' });
    if (!r.ok) { setBanner({ type: 'bad', text: r.text }); return; }
    await loadUsers();
    resetForm();
    setBanner({ type: 'ok', text: `${target.fullName} (${target.userId}) was deleted.` });
  };

  const handleGenerate = () => {
    setField('password', generateTempPassword());
    setShowPw(true);
  };

  /* ---------- table ---------- */

  const visibleUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const hit = !q || [u.fullName, u.email, u.userId].some((v) => v?.toLowerCase().includes(q));
    return hit && (roleFilter === 'All' || u.role === roleFilter);
  });

  const total = users.length;
  const initials = (name = '') =>
    name.replace(/^(Dr|Mr|Mrs|Ms|Prof)\.?\s+/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="um">
      <style>{css}</style>

      <div className="um-main">
        <div className="um-search">
          <span aria-hidden>🔍</span>
          <input placeholder="Search by name, email or ID" value={search}
            onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
        </div>

        <div className="um-roles">
          {Object.entries(ROLES).map(([role, r]) => {
            const active = roleFilter === role;
            const pct = total ? Math.round((counts[role] / total) * 100) : 0;
            return (
              <button key={role} type="button" className={`um-role ${active ? 'active' : ''}`}
                onClick={() => setRoleFilter(active ? 'All' : role)} aria-pressed={active}>
                <div className="um-role-top">
                  <span className="um-ico" style={{ background: active ? 'rgba(255,255,255,.95)' : r.soft }}>{r.icon}</span>
                  <span className="um-role-name">{role}s</span>
                </div>
                <div>
                  <div className="um-role-row"><span>{counts[role]} users</span><span>{pct}%</span></div>
                  <div className="um-bar"><i style={{ width: `${pct}%`, background: active ? '#fff' : r.color }} /></div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ---------- Add / edit form ---------- */}
        <div className="um-card" ref={formRef}>
          <h3 className="um-title">
            {isEdit ? 'Edit user' : 'Add new user'}
            {isEdit && <span className="um-chip">{selectedId}</span>}
          </h3>

          {banner && <div className={`um-alert ${banner.type}`} role={banner.type === 'bad' ? 'alert' : 'status'}>{banner.text}</div>}

          {confirmDelete && (
            <div className="um-confirm" role="alertdialog">
              <span>Delete {form.fullName} ({selectedId})? This cannot be undone.</span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="um-btn danger-solid" onClick={handleDelete}>Yes, delete</button>
                <button type="button" className="um-btn ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </span>
            </div>
          )}

          <form className="um-form" onSubmit={handleSubmit} noValidate>
            <div className="um-field">
              <label htmlFor="um-role">Role</label>
              <select id="um-role" value={form.role} disabled={isEdit} onChange={(e) => setField('role', e.target.value)}>
                {Object.keys(ROLES).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {isEdit && <span className="um-note">Role is fixed because the ID depends on it.</span>}
            </div>

            <div className="um-field">
              <label htmlFor="um-id">User ID</label>
              <input id="um-id" type="text" value={form.userId} readOnly />
            </div>

            <div className="um-field">
              <label htmlFor="um-name">Full name</label>
              <input id="um-name" type="text" placeholder="e.g. Dr. John Doe" className={errors.fullName ? 'err' : ''}
                value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
              {errors.fullName && <span className="um-hint">{errors.fullName}</span>}
            </div>

            <div className="um-field">
              <label htmlFor="um-email">Email</label>
              <input id="um-email" type="email" placeholder="user@gmail.com or user@sab.ac.lk" className={errors.email ? 'err' : ''}
                value={form.email} onChange={(e) => setField('email', e.target.value)} />
              {errors.email
                ? <span className="um-hint">{errors.email}</span>
                : <span className="um-note">Password reset codes are sent to this email.</span>}
            </div>

            <div className="um-field">
              <label htmlFor="um-pass">{isEdit ? 'New temporary password (optional)' : 'Temporary password'}</label>
              <div className="um-pw-row">
                <input id="um-pass" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Set a temporary password'}
                  className={errors.password ? 'err' : ''}
                  value={form.password} onChange={(e) => setField('password', e.target.value)} />
                <button type="button" className="um-mini" onClick={() => setShowPw((s) => !s)}>{showPw ? 'Hide' : 'Show'}</button>
                <button type="button" className="um-mini" onClick={handleGenerate}>Generate</button>
              </div>
              {errors.password
                ? <span className="um-hint">{errors.password}</span>
                : <span className="um-note">The user creates their own strong password at first sign-in.</span>}
            </div>

            <div className="um-field">
              <label htmlFor="um-contact">Contact number (optional)</label>
              <input id="um-contact" type="text" inputMode="numeric" placeholder="e.g. 0712345678"
                className={errors.contactNo ? 'err' : ''} value={form.contactNo} onChange={handleContactChange} />
              {errors.contactNo && <span className="um-hint">{errors.contactNo}</span>}
            </div>

            <div className="um-actions">
              <button type="submit" className="um-btn main">{isEdit ? 'Update user' : '+ Save user'}</button>
              {isEdit && (
                <button type="button" className="um-btn danger" onClick={() => { setBanner(null); setConfirmDelete(true); }}>
                  Delete
                </button>
              )}
              <button type="button" className="um-btn ghost" onClick={() => resetForm()}>Clear</button>
            </div>
          </form>
        </div>

        {/* ---------- Table ---------- */}
        <div className="um-card">
          <div className="um-head">
            <h3 className="um-title" style={{ margin: 0 }}>
              {roleFilter === 'All' ? 'Registered users' : `${roleFilter}s`}{' '}
              <span className="um-sub">({visibleUsers.length})</span>
            </h3>
            {roleFilter !== 'All' && (
              <a href="#about" onClick={(e) => { e.preventDefault(); setRoleFilter('All'); }}>Show all</a>
            )}
          </div>
          <p className="um-tablehint">Select a user to edit or delete them.</p>
          <div className="um-scroll">
            <table>
              <thead>
                <tr><th>Name</th><th>User ID</th><th>Email</th><th>Role</th><th>Contact</th><th>Password</th></tr>
              </thead>
              <tbody>
                {visibleUsers.length === 0 ? (
                  <tr><td colSpan="6" className="um-empty">No users found.</td></tr>
                ) : (
                  visibleUsers.map((u) => {
                    const r = ROLES[u.role] || ROLES.Admin;
                    const temp = !!u.mustChangePassword;
                    return (
                      <tr key={u.userId} tabIndex={0} className={u.userId === selectedId ? 'sel' : ''}
                        aria-selected={u.userId === selectedId}
                        onClick={() => handleSelect(u)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(u); } }}>
                        <td>
                          <div className="um-user">
                            <span className="um-av" style={{ background: r.soft, color: r.color }}>{initials(u.fullName)}</span>
                            {u.fullName}
                          </div>
                        </td>
                        <td className="um-id">{u.userId}</td>
                        <td>{u.email}</td>
                        <td><span className="um-pill" style={{ background: r.soft, color: r.color }}>{u.role}</span></td>
                        <td>{u.contactNo || 'N/A'}</td>
                        <td>
                          <span className="um-pill" style={temp
                            ? { background: '#fff6d9', color: '#b7860b' }
                            : { background: '#e3f6ea', color: '#1f8a4c' }}>
                            {temp ? 'Temporary' : 'Set by user'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---------- Side panel ---------- */}
      <aside className="um-side">
        <div>
          <div className="um-total"><b>{total}</b><span>total users</span></div>
          <div className="um-seg" aria-hidden>
            {Object.entries(ROLES).map(([role, r]) => (
              <i key={role} style={{ width: `${total ? (counts[role] / total) * 100 : 0}%`, background: r.color }} />
            ))}
          </div>
        </div>

        <div className="um-list">
          {Object.entries(ROLES).map(([role, r]) => (
            <div className="um-li" key={role}>
              <span className="um-ico" style={{ background: r.soft }}>{r.icon}</span>
              <div>
                <div className="um-li-name">{role}s</div>
                <div className="um-sub">ID prefix {r.prefix}</div>
              </div>
              <span className="um-li-n">{counts[role]}</span>
            </div>
          ))}
        </div>

        <div className="um-tip">
          <b>{isEdit ? `Editing ${selectedId}` : 'How sign-in works'}</b>
          {isEdit
            ? 'Update the details, or delete the account. Clear returns to the add form.'
            : 'You set a temporary password. At first sign-in the user creates their own strong password.'}
        </div>
      </aside>
    </div>
  );
}

export default UserManagement;