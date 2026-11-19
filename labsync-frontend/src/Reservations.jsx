import React, { useState, useEffect, useRef } from 'react';
import { createReservation } from './api';
import {
  TIMETABLES,
  TIMETABLE_META,
  SLOTS,
  WEEKDAYS,
  DAY_NAMES,
  toMin,
  hasTimetable,
  getSlotBlocks
} from './Labtimetables';

/* ---------- Helpers ---------- */

const TIME_SLOTS = SLOTS;

// Internal records that are NOT normal bookings (shown on the timetable only)
//  - "Released"  : a timetabled lecture that will not happen on that date
//  - "Withdrawn" : a release that was undone
const isReleased = (r) => String(r._status || r.status || '').toLowerCase() === 'released';
const isHidden = (r) => ['released', 'withdrawn'].includes(String(r._status || r.status || '').toLowerCase());

const statusClass = (s) => ({ approved: 'green', rejected: 'red' }[String(s || '').toLowerCase()] || 'amber');

// "13:30:00" -> "1:30 PM"
const fmtTime = (t) => {
  const [h, m] = String(t || '').split(':');
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return '—';
  return `${hour % 12 || 12}:${(m || '00').padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};

// Local date as YYYY-MM-DD (avoids UTC off-by-one)
const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseDay = (key) => {
  const d = new Date(`${key}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

const initials = (name) =>
  String(name || '?')
    .replace(/^(dr|mr|ms|mrs)\.?\s+/i, '')
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const resLabId = (r) => r.labId ?? r.labID ?? r.lab?.labId ?? r.lab?.labID ?? r.lab?.id;
const fmtDay = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const mondayOf = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
// Current week (Mon-Fri); on weekends show next week
const startWeek = () => {
  const now = new Date();
  const m = mondayOf(now);
  return now.getDay() === 0 || now.getDay() === 6 ? addDays(m, 7) : m;
};

/* ---------- Component ---------- */

function Reservations({ reservations = [], labs = [], userRole = '', fetchAllData }) {
  const [resData, setResData] = useState({
    labId: '',
    reservedBy: '',
    reservationDate: '',
    timeSlot: '',
    purpose: ''
  });

  const [localReservations, setLocalReservations] = useState(() => {
    const saved = localStorage.getItem('labsync_local_reservations');
    return saved ? JSON.parse(saved) : [];
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filter, setFilter] = useState('all');
  const [ttLab, setTtLab] = useState('');
  const [weekStart, setWeekStart] = useState(startWeek);
  const formRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('labsync_local_reservations', JSON.stringify(localReservations));
  }, [localReservations]);

  const currentRole = String(userRole || '').toLowerCase();
  const canBook = currentRole === 'lecturer' || currentRole === 'admin';
  const isAdmin = currentRole === 'admin';
  const roleLabel = currentRole ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1) : 'Lecturer';

  const getTimeObject = (slot) => {
    const [start, end] = slot.split('-');
    return { startTime: `${start.trim()}:00`, endTime: `${end.trim()}:00` };
  };

  const getLabName = (res) => {
    const labId = res.labId ?? res.labID ?? res.lab?.labId ?? res.lab?.labID ?? res.lab?.id;
    const found = labs.find((l) => String(l.labId || l.id || l.labID) === String(labId));
    if (found) return found.labName || found.name || found.labCode;
    return res.lab?.labName || res.labName || `Lab #${labId}`;
  };

  /* ---------- Actions ---------- */

  const handleBooking = async (e) => {
    e.preventDefault();

    const chosenSlot = TIME_SLOTS.find((t) => t.value === resData.timeSlot);
    if (!chosenSlot || analyseSlot(formLabName, resData.labId, resData.reservationDate, chosenSlot).blocked) {
      setMessage({ type: 'warning', text: '⚠️ That time slot is not available. Please choose another one.' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    const { startTime, endTime } = getTimeObject(resData.timeSlot);

    const reservationPayload = {
      reservedBy: resData.reservedBy,
      labId: Number(resData.labId),
      reservationDate: resData.reservationDate,
      startTime,
      endTime,
      purpose: resData.purpose,
      status: 'Pending'
    };

    try {
      await createReservation(reservationPayload);
      setMessage({ type: 'success', text: '✅ Lab reservation submitted successfully!' });
      if (fetchAllData) fetchAllData();
    } catch (err) {
      console.error('Backend Error Details:', err);
      setLocalReservations((prev) => [{ reservationId: Date.now(), ...reservationPayload }, ...prev]);
      setMessage({ type: 'warning', text: '⚠️ Saved in local storage view (Backend unavailable).' });
    } finally {
      setResData({ labId: '', reservedBy: '', reservationDate: '', timeSlot: '', purpose: '' });
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (reservationId, newStatus, okText) => {
    try {
      const response = await fetch(`http://localhost:8080/api/reservations/${reservationId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: okText || `Reservation status updated to ${newStatus}` });
        if (fetchAllData) fetchAllData();
      } else {
        throw new Error('Failed to update status on server');
      }
    } catch (err) {
      setLocalReservations((prev) =>
        prev.map((res) => ((res.reservationId || res.id) === reservationId ? { ...res, status: newStatus } : res))
      );
      setMessage({ type: 'warning', text: `Status updated to ${newStatus} (Local State)` });
    }
  };

  // A lecturer can't hold a timetabled lecture on one date -> release that slot
  const handleRelease = async (day, slot, lectures) => {
    const codes = lectures.map((b) => b.code).join(', ');
    const ok = window.confirm(
      `Release ${codes} on ${fmtDay(day.date)} (${slot.label || slot.value})?\n\n` +
        'The slot will open up for student use or for another lecturer to book.'
    );
    if (!ok) return;

    const { startTime, endTime } = getTimeObject(slot.value);
    const payload = {
      reservedBy: roleLabel,
      labId: Number(activeLab.id),
      reservationDate: day.key,
      startTime,
      endTime,
      purpose: codes,
      status: 'Released'
    };

    try {
      await createReservation(payload);
      setMessage({ type: 'success', text: `✅ ${codes} released. The slot is now open for student use or another lecturer.` });
      if (fetchAllData) fetchAllData();
    } catch (err) {
      console.error('Release error:', err);
      setLocalReservations((prev) => [{ reservationId: Date.now(), ...payload }, ...prev]);
      setMessage({ type: 'warning', text: '⚠️ Release saved in local view only (Backend unavailable).' });
    }
  };

  // Undo a release -> the timetabled lecture is back
  const handleUndoRelease = (rec) => {
    handleStatusChange(rec._id, 'Withdrawn', '✅ Release undone. The lecture is back on the timetable.');
  };

  /* ---------- Derived data ---------- */

  const combined = [...localReservations, ...reservations].map((res, i) => ({
    ...res,
    _id: res.reservationId || res.id || res.reservationID || i + 1,
    _status: res.status || 'Pending',
    _day: String(res.reservationDate || res.date || '').substring(0, 10)
  }));

  // Real bookings only (releases are not shown as bookings)
  const bookings = combined.filter((r) => !isHidden(r));

  const count = (s) => bookings.filter((r) => r._status.toLowerCase() === s).length;
  const total = bookings.length || 1;
  const tabs = [
    { key: 'all', label: 'All', n: bookings.length },
    { key: 'pending', label: 'Pending', n: count('pending') },
    { key: 'approved', label: 'Approved', n: count('approved') },
    { key: 'rejected', label: 'Rejected', n: count('rejected') }
  ];

  const visible = bookings.filter((r) => filter === 'all' || r._status.toLowerCase() === filter);

  // Group by day, earliest day first, earliest time first inside a day
  const days = visible.reduce((acc, r) => {
    (acc[r._day] = acc[r._day] || []).push(r);
    return acc;
  }, {});
  const dayKeys = Object.keys(days).sort();
  dayKeys.forEach((k) => days[k].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))));

  const today = localDateStr();

  /* ---------- Timetable + availability ---------- */

  const weekDays = WEEKDAYS.map((name, i) => {
    const date = addDays(weekStart, i);
    return { name, date, key: localDateStr(date) };
  });

  const ttTabs = (() => {
    const fromLabs = labs
      .map((l) => ({ id: l.labId || l.id || l.labID, name: l.labName || l.name || l.labCode }))
      .filter((l) => hasTimetable(l.name));
    return fromLabs.length ? fromLabs : Object.keys(TIMETABLES).map((k) => ({ id: undefined, name: k }));
  })();
  const activeLab = ttTabs.find((l) => l.name === ttLab) || ttTabs[0];

  // What occupies a slot: timetabled lectures (unless released) + other bookings (pending / approved)
  const analyseSlot = (labName, labId, dateStr, slot) => {
    const d = parseDay(dateStr);
    const [s, e] = slot.value.split('-').map(toMin);
    const blocks = d ? getSlotBlocks(labName, DAY_NAMES[d.getDay()], slot.value) : [];

    const overlaps = (r) =>
      r._day === dateStr &&
      String(resLabId(r)) === String(labId) &&
      toMin(r.startTime) < e &&
      toMin(r.endTime) > s;

    const extras =
      labId === undefined
        ? []
        : bookings.filter((r) => r._status.toLowerCase() !== 'rejected' && overlaps(r));

    const releaseRecs = labId === undefined ? [] : combined.filter((r) => isReleased(r) && overlaps(r));

    const rawLectures = blocks.filter((b) => b.code);
    const released = rawLectures.length ? releaseRecs : []; // a release only matters if a lecture is there
    const lectures = released.length ? [] : rawLectures;

    return {
      lectures,
      released,
      students: blocks.filter((b) => !b.code),
      extras,
      blocked: lectures.length > 0 || extras.length > 0
    };
  };

  const formLab = labs.find((l) => String(l.labId || l.id || l.labID) === String(resData.labId));
  const formLabName = formLab ? formLab.labName || formLab.name || formLab.labCode : '';
  const formReady = !!(resData.labId && resData.reservationDate);
  const slotOptions = TIME_SLOTS.map((slot) => ({
    slot,
    info: formReady ? analyseSlot(formLabName, resData.labId, resData.reservationDate, slot) : null
  }));

  // If the chosen lab/date makes the selected slot unavailable, clear it
  useEffect(() => {
    if (!formReady || !resData.timeSlot) return;
    const opt = slotOptions.find((o) => o.slot.value === resData.timeSlot);
    if (opt?.info?.blocked) setResData((p) => ({ ...p, timeSlot: '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resData.labId, resData.reservationDate, resData.timeSlot, combined.length]);

  const pickCell = (day, slot) => {
    if (!canBook || activeLab?.id === undefined) return;
    setResData((p) => ({ ...p, labId: String(activeLab.id), reservationDate: day.key, timeSlot: slot.value }));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const clip = (b, slot) => {
    const [s, e] = slot.value.split('-').map(toMin);
    return b.s <= s && b.e >= e ? '' : ` ${fmtTime(hhmm(Math.max(b.s, s)))}–${fmtTime(hhmm(Math.min(b.e, e)))}`;
  };

  const weekLabel = `${fmtDay(weekDays[0].date)} – ${fmtDay(weekDays[4].date)} ${weekDays[4].date.getFullYear()}`;

  const field = (key) => ({
    value: resData[key],
    onChange: (e) => setResData({ ...resData, [key]: e.target.value })
  });

  /* ---------- Render ---------- */

  return (
    <div className="rv-page">
      <style>{css}</style>

      <header className="rv-header">
        <div>
          <h2>Lab Reservations</h2>
          <p>Your lab schedule, day by day.</p>
        </div>
        <div className="rv-segment" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={filter === t.key}
              className={filter === t.key ? 'active' : ''}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
              <em>{t.n}</em>
            </button>
          ))}
        </div>
      </header>

      {message.text && (
        <div className={`rv-alert ${message.type === 'success' ? 'ok' : 'warn'}`} role="status">
          {message.text}
        </div>
      )}

      <div className="rv-layout">
        {/* ---------- Agenda ---------- */}
        <main className="rv-agenda">
          <section className="rv-tt">
            <div className="rv-tt-head">
              <div>
                <h3 className="rv-sec-title">Weekly lab timetable</h3>
                <p className="rv-sub">
                  {TIMETABLE_META.title} · timetable valid {TIMETABLE_META.validFrom} to {TIMETABLE_META.validTo}
                </p>
              </div>
              <div className="rv-tt-nav">
                <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">‹</button>
                <span>{weekLabel}</span>
                <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">›</button>
                <button type="button" className="rv-link" onClick={() => setWeekStart(startWeek())}>This week</button>
              </div>
            </div>

            <div className="rv-lab-tabs">
              {ttTabs.map((l) => (
                <button
                  type="button"
                  key={l.name}
                  className={activeLab && l.name === activeLab.name ? 'active' : ''}
                  onClick={() => setTtLab(l.name)}
                >
                  {l.name}
                </button>
              ))}
            </div>

            {activeLab && (
              <div className="rv-grid-wrap">
                <div className="rv-grid">
                  <div className="rv-g-head">Time</div>
                  {weekDays.map((day) => (
                    <div key={day.name} className={`rv-g-head ${day.key === today ? 'today' : ''}`}>
                      {day.name}
                      <small>{fmtDay(day.date)}</small>
                    </div>
                  ))}

                  {TIME_SLOTS.map((slot) => (
                    <React.Fragment key={slot.value}>
                      <div className="rv-g-time">
                        <span>{fmtTime(slot.value.split('-')[0])}</span>
                        <span>{fmtTime(slot.value.split('-')[1])}</span>
                      </div>

                      {weekDays.map((day) => {
                        const info = analyseSlot(activeLab.name, activeLab.id, day.key, slot);
                        const state = info.lectures.length
                          ? 'lecture'
                          : info.extras.length
                          ? 'extra'
                          : info.released.length
                          ? 'released'
                          : info.students.length
                          ? 'student'
                          : 'free';
                        const past = day.key < today;
                        const hasLab = activeLab.id !== undefined;
                        const clickable =
                          canBook && !past && hasLab && (state === 'student' || state === 'free' || state === 'released');
                        const canRelease = canBook && !past && hasLab;

                        return (
                          <div
                            key={day.key}
                            className={`rv-cell ${state} ${clickable ? 'click' : ''} ${past ? 'past' : ''}`}
                            onClick={clickable ? () => pickCell(day, slot) : undefined}
                            onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && pickCell(day, slot) : undefined}
                            role={clickable ? 'button' : undefined}
                            tabIndex={clickable ? 0 : undefined}
                            title={clickable ? 'Click to request this slot' : undefined}
                          >
                            {state === 'lecture' &&
                              info.lectures.map((b, i) => (
                                <span key={i}>
                                  <b>{b.code}</b>
                                  <em>{clip(b, slot)}</em>
                                </span>
                              ))}
                            {state === 'lecture' && canRelease && (
                              <button
                                type="button"
                                className="rv-mini"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRelease(day, slot, info.lectures);
                                }}
                                title="This lecture will not happen on this date"
                              >
                                Release slot
                              </button>
                            )}

                            {state === 'extra' &&
                              info.extras.map((r, i) => (
                                <span key={i}>
                                  <b>Extra: {r.purpose || 'Lecture'}</b>
                                  <em> {r._status}</em>
                                </span>
                              ))}

                            {state === 'released' && (
                              <>
                                <span>
                                  <b>Released</b>
                                  <em> {info.released.map((r) => r.purpose).filter(Boolean).join(', ')}</em>
                                </span>
                                <em className="rv-open-note">Open for student use or another lecturer</em>
                                {canRelease && (
                                  <button
                                    type="button"
                                    className="rv-mini"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUndoRelease(info.released[0]);
                                    }}
                                  >
                                    Undo release
                                  </button>
                                )}
                              </>
                            )}

                            {state === 'student' && <b>Student use</b>}
                            {state === 'free' && <b>Available</b>}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            <div className="rv-legend-row">
              <span><i style={{ background: '#fbe9e9', border: '1px solid #f1c4c4' }} />Timetabled lecture (reserved)</span>
              <span><i style={{ background: '#e4eefc', border: '1px solid #b9d0f2' }} />Lecture released (open)</span>
              <span><i style={{ background: '#fff1c9', border: '1px solid #f0d27a' }} />Extra lecture booking</span>
              <span><i style={{ background: '#e8f6ee', border: '1px solid #c5e7d3' }} />Student use (can be booked)</span>
              <span><i style={{ background: '#fff', border: '1px dashed #c5cadb' }} />Available</span>
            </div>
            {canBook && (
              <p className="rv-sub" style={{ marginTop: 10 }}>
                Click a green, blue or empty slot to fill the extra lecture form. If a lecture can't be held on a
                date, use "Release slot" so students or another lecturer can use it.
              </p>
            )}
          </section>

          <h3 className="rv-sec-title rv-agenda-title">Extra lecture bookings</h3>
          {dayKeys.length === 0 ? (
            <div className="rv-empty">
              <strong>No reservations</strong>
              <span>Nothing is scheduled for this filter yet.</span>
            </div>
          ) : (
            dayKeys.map((key) => {
              const d = parseDay(key);
              const isToday = key === today;
              const isPast = key && key < today;

              return (
                <section key={key || 'unknown'} className={`rv-day ${isPast ? 'past' : ''}`}>
                  <div className="rv-date">
                    {d ? (
                      <>
                        <span className="rv-date-wd">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                        <span className="rv-date-num">{d.getDate()}</span>
                        <span className="rv-date-mo">
                          {d.toLocaleDateString('en-GB', { month: 'short' })} {d.getFullYear()}
                        </span>
                      </>
                    ) : (
                      <span className="rv-date-mo">No date</span>
                    )}
                    {isToday && <b className="rv-today">Today</b>}
                  </div>

                  <div className="rv-events">
                    {days[key].map((res, i) => (
                      <article key={`${res._id}-${i}`} className={`rv-event ${statusClass(res._status)}`}>
                        <div className="rv-event-time">
                          <strong>{fmtTime(res.startTime)}</strong>
                          <span>{fmtTime(res.endTime)}</span>
                        </div>

                        <div className="rv-event-main">
                          <div className="rv-event-title">
                            {res.purpose || 'Lab session'}
                            <span className="rv-lab-tag">{getLabName(res)}</span>
                          </div>
                          <div className="rv-event-meta">
                            <i className="rv-avatar">{initials(res.reservedBy)}</i>
                            {res.reservedBy || 'Lecturer'}
                            <span className="rv-dot">•</span>
                            Request {res._id}
                          </div>
                        </div>

                        <div className="rv-event-side">
                          <b className={`rv-pill ${statusClass(res._status)}`}>{res._status}</b>
                          {isAdmin && res._status.toLowerCase() === 'pending' && (
                            <div className="rv-actions">
                              <button className="rv-btn success sm" onClick={() => handleStatusChange(res._id, 'Approved')}>
                                Approve
                              </button>
                              <button className="rv-btn ghost-danger sm" onClick={() => handleStatusChange(res._id, 'Rejected')}>
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </main>

        {/* ---------- Side panel ---------- */}
        <aside className="rv-side">
          <div className="rv-panel">
            <h3>Overview</h3>
            <div className="rv-bar" aria-hidden="true">
              <span className="green" style={{ width: `${(count('approved') / total) * 100}%` }} />
              <span className="amber" style={{ width: `${(count('pending') / total) * 100}%` }} />
              <span className="red" style={{ width: `${(count('rejected') / total) * 100}%` }} />
            </div>
            <ul className="rv-legend">
              <li><i className="green" />Approved<b>{count('approved')}</b></li>
              <li><i className="amber" />Pending<b>{count('pending')}</b></li>
              <li><i className="red" />Rejected<b>{count('rejected')}</b></li>
            </ul>
          </div>

          {canBook ? (
            <div className="rv-panel" ref={formRef}>
              <h3>Extra lecture request</h3>
              <p className="rv-sub">Times used by timetabled lectures or other bookings can't be selected.</p>
              <form onSubmit={handleBooking} className="rv-form">
                <label>
                  Lab
                  <select {...field('labId')} required>
                    <option value="">Select lab</option>
                    {labs.map((l) => {
                      const id = l.labId || l.id || l.labID;
                      return (
                        <option key={id} value={id}>
                          {l.labName || l.name || `Lab ${id}`}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label>
                  Reserved by
                  <input type="text" {...field('reservedBy')} placeholder="e.g. Mrs / Mr." required />
                </label>

                <label>
                  Date
                  <input type="date" {...field('reservationDate')} min={today} required />
                </label>

                <label>
                  Time slot
                  <select {...field('timeSlot')} required>
                    <option value="" disabled>
                      {formReady ? 'Select time slot' : 'Select lab and date first'}
                    </option>
                    {slotOptions.map(({ slot: t, info }) => (
                      <option key={t.value} value={t.value} disabled={!!info?.blocked}>
                        {`${t.label}${
                          info?.blocked
                            ? info.lectures.length
                              ? '  — Lecture'
                              : '  — Already booked'
                            : info?.released.length
                            ? '  — Lecture released'
                            : ''
                        }`}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Module / purpose
                  <input type="text" {...field('purpose')} placeholder="e.g. CIT111" required />
                </label>

                <button type="submit" disabled={submitting} className="rv-btn primary block">
                  {submitting ? 'Booking...' : 'Reserve lab'}
                </button>
              </form>
            </div>
          ) : (
            <div className="rv-panel rv-note">
              <h3>Booking</h3>
              <p>
                Only <strong>Lecturers</strong> and <strong>Admins</strong> can submit new lab reservations.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const css = `
.rv-page{--maroon:#800000;--gold:#f5ab16;--ink:#1d2330;--muted:#7d8496;--line:#e8eaf1;--bg:#f6f5f2;
  font-family:'Inter','Segoe UI',system-ui,sans-serif;color:var(--ink);background:var(--bg);
  max-width:1200px;margin:0 auto;padding:28px 24px 48px;box-sizing:border-box}
.rv-page *{box-sizing:border-box}

/* Header */
.rv-header{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:22px}
.rv-header h2{margin:0;font-size:26px;font-weight:700;letter-spacing:-.3px}
.rv-header p{margin:4px 0 0;color:var(--muted);font-size:14px}
.rv-segment{display:flex;gap:2px;padding:4px;background:#fff;border:1px solid var(--line);border-radius:10px;flex-wrap:wrap}
.rv-segment button{border:none;background:transparent;padding:7px 14px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer}
.rv-segment button em{font-style:normal;margin-left:6px;font-size:11px;opacity:.7}
.rv-segment button.active{background:var(--maroon);color:#fff}

.rv-alert{padding:11px 14px;border-radius:10px;margin-bottom:18px;font-size:13px;font-weight:600}
.rv-alert.ok{background:#e8f7ee;color:#166534;border:1px solid #bde5cb}
.rv-alert.warn{background:#fff4d0;color:#8a5a00;border:1px solid #ecd48a}

/* Layout */
.rv-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;align-items:start}

/* Agenda */
.rv-day{display:grid;grid-template-columns:96px minmax(0,1fr);gap:16px;margin-bottom:22px}
.rv-day.past{opacity:.6}
.rv-date{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 6px;background:#fff;border:1px solid var(--line);border-radius:12px;height:fit-content;text-align:center}
.rv-date-wd{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--maroon)}
.rv-date-num{font-size:30px;font-weight:700;line-height:1.1}
.rv-date-mo{font-size:11px;color:var(--muted)}
.rv-today{margin-top:6px;font-size:10px;letter-spacing:.5px;text-transform:uppercase;padding:2px 8px;border-radius:999px;background:var(--gold);color:#2b1a00}

.rv-events{display:flex;flex-direction:column;gap:10px}
.rv-event{display:grid;grid-template-columns:84px minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px 18px;background:#fff;border:1px solid var(--line);border-left:5px solid var(--gold);border-radius:12px;transition:box-shadow .15s,transform .15s}
.rv-event:hover{box-shadow:0 6px 18px rgba(29,35,48,.08);transform:translateY(-1px)}
.rv-event.green{border-left-color:#16a34a}
.rv-event.red{border-left-color:#dc2626}
.rv-event.amber{border-left-color:var(--gold)}
.rv-event-time{display:flex;flex-direction:column;font-size:12px;color:var(--muted)}
.rv-event-time strong{font-size:14px;color:var(--ink)}
.rv-event-title{display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:15px;font-weight:600}
.rv-lab-tag{font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;background:#fbeaea;color:var(--maroon)}
.rv-event-meta{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12.5px;color:var(--muted)}
.rv-dot{opacity:.5}
.rv-avatar{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:9px;font-weight:700;color:#fff;background:linear-gradient(135deg,#800000,#c0504d)}
.rv-event-side{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.rv-actions{display:flex;gap:6px}

/* Pills + buttons */
.rv-pill{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700}
.rv-pill.amber{background:#fff4d0;color:#a16207}
.rv-pill.green{background:#e3f6ea;color:#15803d}
.rv-pill.red{background:#fde8e8;color:#c81e1e}
.rv-btn{border:1px solid transparent;border-radius:8px;padding:10px 18px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:filter .15s,background .15s}
.rv-btn:hover:not(:disabled){filter:brightness(1.07)}
.rv-btn:disabled{opacity:.6;cursor:not-allowed}
.rv-btn.primary{background:var(--maroon);color:#fff}
.rv-btn.success{background:#16a34a;color:#fff}
.rv-btn.ghost-danger{background:#fff;color:#c81e1e;border-color:#f3c0c0}
.rv-btn.ghost-danger:hover{background:#fdeeee}
.rv-btn.sm{padding:5px 12px;font-size:12px}
.rv-btn.block{width:100%;margin-top:6px}

/* Side panels */
.rv-side{display:flex;flex-direction:column;gap:18px;position:sticky;top:16px}
.rv-panel{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px}
.rv-panel h3{margin:0 0 14px;font-size:15px;font-weight:700}
.rv-note p{margin:0;font-size:13px;line-height:1.6;color:#4a5064}

.rv-bar{display:flex;height:10px;border-radius:999px;overflow:hidden;background:#eef0f5;margin-bottom:14px}
.rv-bar span{display:block;height:100%}
.rv-bar .green,.rv-legend .green{background:#16a34a}
.rv-bar .amber,.rv-legend .amber{background:var(--gold)}
.rv-bar .red,.rv-legend .red{background:#dc2626}
.rv-legend{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.rv-legend li{display:flex;align-items:center;gap:10px;font-size:13px;color:#4a5064}
.rv-legend i{width:10px;height:10px;border-radius:50%}
.rv-legend b{margin-left:auto;color:var(--ink)}

.rv-form{display:flex;flex-direction:column;gap:12px}
.rv-form label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--muted)}
.rv-form select,.rv-form input{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:#fafbfd;font-family:inherit;font-size:13px;color:var(--ink);text-transform:none;letter-spacing:0;outline:none;transition:border-color .15s,box-shadow .15s}
.rv-form select:focus,.rv-form input:focus{background:#fff;border-color:var(--gold);box-shadow:0 0 0 3px rgba(245,171,22,.2)}

.rv-empty{display:flex;flex-direction:column;gap:4px;align-items:center;padding:48px 20px;background:#fff;border:2px dashed #d9dcea;border-radius:14px;color:var(--muted);text-align:center}
.rv-empty strong{color:var(--ink);font-size:16px}

.rv-sec-title{margin:0 0 4px;font-size:18px;font-weight:700}
.rv-agenda-title{margin:6px 0 14px}
.rv-sub{margin:0 0 14px;font-size:12.5px;color:var(--muted)}
.rv-tt{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:26px}
.rv-tt-head{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px}
.rv-tt-nav{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600}
.rv-tt-nav button{border:1px solid var(--line);background:#fff;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:16px;font-family:inherit}
.rv-tt-nav .rv-link{width:auto;padding:0 12px;font-size:12px;font-weight:600}
.rv-lab-tabs{display:flex;gap:6px;margin:4px 0 14px}
.rv-lab-tabs button{border:1px solid var(--line);background:#fff;padding:6px 18px;border-radius:999px;font-family:inherit;font-size:12px;font-weight:700;color:var(--muted);cursor:pointer}
.rv-lab-tabs button.active{background:var(--maroon);border-color:var(--maroon);color:#fff}
.rv-grid-wrap{overflow-x:auto;padding-bottom:4px}
.rv-grid{display:grid;grid-template-columns:78px repeat(5,minmax(112px,1fr));gap:6px;min-width:680px}
.rv-g-head{padding:8px 6px;text-align:center;font-size:12px;font-weight:700;background:#f4f5fa;border-radius:8px}
.rv-g-head small{display:block;font-weight:500;color:var(--muted);font-size:11px}
.rv-g-head.today{background:var(--gold);color:#2b1a00}
.rv-g-head.today small{color:#5a3b00}
.rv-g-time{display:flex;flex-direction:column;justify-content:center;font-size:11px;color:var(--muted);font-weight:600;padding:0 4px}
.rv-cell{min-height:64px;padding:7px 8px;border-radius:8px;font-size:11px;line-height:1.35;display:flex;flex-direction:column;gap:4px;border:1px solid transparent;transition:box-shadow .15s}
.rv-cell b{font-weight:700;font-size:11px;word-break:break-word}
.rv-cell em{font-style:normal;opacity:.75}
.rv-cell.lecture{background:#fbe9e9;border-color:#f1c4c4;color:#7a1414}
.rv-cell.released{background:#e4eefc;border-color:#b9d0f2;color:#1f4a8a}
.rv-cell.extra{background:#fff1c9;border-color:#f0d27a;color:#7a5200}
.rv-cell.student{background:#e8f6ee;border-color:#c5e7d3;color:#1d6b3f}
.rv-cell.free{background:#fff;border:1px dashed #d5d9e6;color:var(--muted)}
.rv-cell.click{cursor:pointer}
.rv-cell.click:hover,.rv-cell.click:focus-visible{box-shadow:0 0 0 2px var(--gold);outline:none}
.rv-cell.past{opacity:.45}
.rv-open-note{font-size:10.5px}
.rv-mini{align-self:flex-start;margin-top:auto;border:1px solid currentColor;background:rgba(255,255,255,.7);color:inherit;border-radius:6px;padding:2px 8px;font-family:inherit;font-size:10.5px;font-weight:700;cursor:pointer}
.rv-mini:hover{background:#fff}
.rv-legend-row{display:flex;gap:16px;flex-wrap:wrap;margin-top:14px;font-size:12px;color:#4a5064}
.rv-legend-row i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-2px}

@media (max-width:980px){
  .rv-layout{grid-template-columns:1fr}
  .rv-side{position:static;order:-1}
}
@media (max-width:640px){
  .rv-page{padding:20px 14px 40px}
  .rv-day{grid-template-columns:1fr}
  .rv-date{flex-direction:row;justify-content:flex-start;gap:10px;padding:10px 14px}
  .rv-event{grid-template-columns:1fr;gap:10px}
  .rv-event-side{flex-direction:row;align-items:center;justify-content:space-between}
}
`;

export default Reservations;