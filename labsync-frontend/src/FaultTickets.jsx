import React, { useState, useEffect } from 'react';
import {
  isActiveFault,
  isEquipmentFault,
  getFaultItemLabel,
  getActiveFaultsForAsset,
  getAssetId,
  getFaultId
} from './Faultutils';

/* ---------- Helpers ---------- */

const STEPS = [
  { id: 'Pending Repair', label: 'Reported', sub: 'Awaiting triage', cls: 'amber' },
  { id: 'In Progress', label: 'On Process', sub: 'Technician working on the fix', cls: 'teal' },
  { id: 'Resolved', label: 'Done', sub: 'Marked as completed', cls: 'green' }
];

const EQUIPMENT_TYPES = ['Air Conditioner', 'Projector', 'Network / WiFi', 'Lighting', 'Furniture', 'Other'];

const getStepIndex = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('progress') || s.includes('process')) return 1;
  if (s.includes('resolved') || s.includes('done')) return 2;
  return 0;
};

const getTimeOpen = (dateStr, now) => {
  if (!dateStr) return 'N/A';
  const str = String(dateStr).includes('T') ? dateStr : String(dateStr).replace(' ', 'T');
  const diffMs = now.getTime() - new Date(str).getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
};

const priorityClass = (p) =>
  ({ CRITICAL: 'crit', HIGH: 'high', MEDIUM: 'med' }[String(p || '').toUpperCase()] || 'low');

const initials = (name) =>
  String(name || '?')
    .replace(/^(dr|mr|ms|mrs)\.?\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/* ---------- Status stepper ---------- */

const StatusStepper = ({ status }) => {
  const current = getStepIndex(status);
  return (
    <div className="ft-stepper">
      {STEPS.map((step, i) => (
        <div key={step.id} className={`ft-step ${i < current ? 'done' : ''} ${i === current ? 'current' : ''}`}>
          <span className="ft-step-dot">{i < current ? '✓' : i + 1}</span>
          <div>
            <div className="ft-step-label">{step.label}</div>
            <div className="ft-step-sub">{step.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------- Main component ---------- */

function FaultTickets({
  userRole,
  currentUser,
  labs = [],
  assets = [],
  faults = [],
  formData = {},
  setFormData,
  handleSubmitFault,
  submitting,
  message,
  handleFixTicket,
  handleUpdateStatus
}) {
  const currentRole = userRole ? String(userRole).trim().toLowerCase() : '';
  const isLecturerOrAdmin = currentRole === 'lecturer' || currentRole === 'admin';
  const isTechnicianOrAdmin = currentRole === 'technician' || currentRole === 'admin';

  const [selectedStatuses, setSelectedStatuses] = useState({});
  const [closedLabs, setClosedLabs] = useState({});
  const [expanded, setExpanded] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const toggleLab = (name) => setClosedLabs((p) => ({ ...p, [name]: !p[name] }));
  const toggleTicket = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const getLabName = (fault) => {
    if (fault?.lab?.labName) return fault.lab.labName;
    if (fault?.lab?.name) return fault.lab.name;
    if (fault?.labName) return fault.labName;

    const labId =
      fault?.labID || fault?.labId || fault?.lab_id || fault?.lab?.labID || fault?.lab?.labId || fault?.lab?.id;

    if (labId && Array.isArray(labs) && labs.length > 0) {
      const match = labs.find((l) => String(l.labID || l.labId || l.id) === String(labId));
      if (match) return match.labName || match.name || match.labCode;
    }
    return labId ? `Lab #${labId}` : 'General Lab';
  };

  const getPriority = (fault) =>
    fault?.priority || fault?.priorityLevel || fault?.priority_level || fault?.prio || 'Medium';

  // Who is submitting the ticket (taken from the logged-in user)
  const defaultName =
    currentUser?.fullName ||
    currentUser?.name ||
    currentUser?.username ||
    currentUser?.userId ||
    (currentRole ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1) : 'Unknown');
  const reporterEmail = currentUser?.email || '';
  const reporterId = String(currentUser?.userId ?? currentUser?.id ?? '');

  // Keep the reporter details inside the form data, so they are sent with every ticket
  // (the backend uses reporterEmail to send the "resolved" mail back to this person).
  useEffect(() => {
    if (!setFormData) return;
    if (
      formData?.reportedBy !== defaultName ||
      (formData?.reporterEmail ?? '') !== reporterEmail ||
      (formData?.reporterId ?? '') !== reporterId
    ) {
      setFormData((prev) => ({ ...prev, reportedBy: defaultName, reporterEmail, reporterId }));
    }
  }, [formData?.reportedBy, formData?.reporterEmail, formData?.reporterId, defaultName, reporterEmail, reporterId, setFormData]);

  // Make sure a fault type is always set (default: computer)
  useEffect(() => {
    if (!setFormData) return;
    if (!formData?.faultType) {
      setFormData((prev) => ({ ...prev, faultType: 'computer' }));
    }
  }, [formData?.faultType, setFormData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (!setFormData) return;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: value,
        ...(name === 'labID' || name === 'labId' ? { labID: value, labId: value } : {})
      };

      // Changing the lab clears the chosen computer
      if (name === 'labID' || name === 'labId') {
        next.assetID = '';
        next.computerNo = '';
      }

      // Switching between "Computer" and "Lab equipment" resets the related fields
      if (name === 'faultType') {
        next.assetID = '';
        next.computerNo = '';
        next.equipmentType = '';
      }

      // Link the ticket to the computer: also store its computer number,
      // so computers can match the ticket even without an asset id.
      if (name === 'assetID') {
        const picked = (Array.isArray(assets) ? assets : []).find(
          (a) => String(getAssetId(a) ?? a.computerNo) === String(value)
        );
        next.computerNo = picked?.computerNo ? String(picked.computerNo) : '';
      }
      return next;
    });
  };

  const handleTempStatusChange = (reportID, newStatus) => {
    setSelectedStatuses((prev) => ({ ...prev, [reportID]: newStatus }));
    if (newStatus !== 'Resolved' && handleUpdateStatus) handleUpdateStatus(reportID, newStatus);
  };

  const handleConfirmResolve = (reportID) => {
    const chosen = selectedStatuses[reportID] || 'Resolved';
    if (handleFixTicket) handleFixTicket(reportID, chosen);
    else if (handleUpdateStatus) handleUpdateStatus(reportID, chosen);
  };

  /* ---------- Derived data ---------- */

  const activeFaults = Array.isArray(faults) ? faults.filter(isActiveFault) : [];

  const reportedCount = activeFaults.filter((f) => getStepIndex(f.status) === 0).length;
  const processCount = activeFaults.filter((f) => getStepIndex(f.status) === 1).length;
  const urgentCount = activeFaults.filter((f) =>
    ['CRITICAL', 'HIGH'].includes(String(getPriority(f)).toUpperCase())
  ).length;

  const visibleFaults =
    statusFilter === 'all' ? activeFaults : activeFaults.filter((f) => getStepIndex(f.status) === statusFilter);

  const groupedFaults = visibleFaults.reduce((acc, fault) => {
    const name = getLabName(fault);
    (acc[name] = acc[name] || []).push(fault);
    return acc;
  }, {});

  const isEquipment = formData?.faultType === 'equipment';

  const selectedLabId = formData?.labID || formData?.labId || '';
  const filteredAssets = Array.isArray(assets)
    ? assets.filter((a) => {
        const assetLabId = a.labID || a.labId || a.lab_id || a.lab?.labID || a.lab?.id;
        if (!selectedLabId) return false;
        return String(assetLabId) === String(selectedLabId);
      })
    : [];

  const faultCtx = { labs, assets };
  const assetValue = (a) => String(getAssetId(a) ?? a.computerNo ?? '');
  const selectedAsset = filteredAssets.find((a) => assetValue(a) === String(formData?.assetID || ''));
  const selectedAssetFaults =
    selectedAsset && !isEquipment ? getActiveFaultsForAsset(selectedAsset, activeFaults, faultCtx) : [];

  const isSuccess = String(message || '').includes('✅');

  const tabs = [
    { key: 'all', label: 'All', count: activeFaults.length },
    { key: 0, label: 'Reported', count: reportedCount },
    { key: 1, label: 'On Process', count: processCount }
  ];

  /* ---------- Render ---------- */

  return (
    <div className="ft-page">
      <style>{css}</style>

      {/* Header */}
      <header className="ft-header">
        <h2>
          Fault Tickets <strong>Overview</strong>
        </h2>
        <p>Monitor, manage, and resolve laboratory hardware and software issues.</p>
      </header>

      {/* Stat tiles */}
      <div className="ft-tiles">
        <div className="ft-tile maroon">
          <span className="ft-tile-num">{activeFaults.length}</span>
          <span className="ft-tile-label">Active tickets</span>
        </div>
        <div className="ft-tile amber">
          <span className="ft-tile-num">{reportedCount}</span>
          <span className="ft-tile-label">Reported</span>
        </div>
        <div className="ft-tile teal">
          <span className="ft-tile-num">{processCount}</span>
          <span className="ft-tile-label">On process</span>
        </div>
        <div className="ft-tile crimson">
          <span className="ft-tile-num">{urgentCount}</span>
          <span className="ft-tile-label">High / Critical</span>
        </div>
      </div>

      {/* Report form */}
      {isLecturerOrAdmin && (
        <section className="ft-card">
          <div className="ft-card-head">
            <h3>Report a fault</h3>
            <span className="ft-chip">{currentRole === 'admin' ? 'Admin access' : 'Lecturer access'}</span>
          </div>

          {message && <div className={`ft-alert ${isSuccess ? 'ok' : 'err'}`}>{message}</div>}

          <form onSubmit={handleSubmitFault} className="ft-form">
            <div className="ft-field">
              <label>Fault type</label>
              <select name="faultType" value={formData?.faultType || 'computer'} onChange={handleInputChange}>
                <option value="computer">Computer</option>
                <option value="equipment">Lab equipment (AC, projector...)</option>
              </select>
            </div>

            <div className="ft-field">
              <label>Laboratory</label>
              <select name="labID" value={selectedLabId} onChange={handleInputChange} required>
                <option value="" disabled>
                  Select laboratory
                </option>
                {Array.isArray(labs) &&
                  labs.map((lab) => {
                    const id = lab.labID || lab.labId || lab.id;
                    return (
                      <option key={id} value={id}>
                        {lab.labName || lab.name || lab.labCode || `Lab ${id}`}
                      </option>
                    );
                  })}
              </select>
            </div>

            {isEquipment ? (
              <div className="ft-field">
                <label>Equipment type</label>
                <select
                  name="equipmentType"
                  value={formData?.equipmentType || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="" disabled>
                    Select equipment
                  </option>
                  {EQUIPMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="ft-field">
                <label>Computer No (asset)</label>
                <select name="assetID" value={formData?.assetID || ''} onChange={handleInputChange} required>
                  <option value="" disabled>
                    Select computer
                  </option>
                  {filteredAssets.length > 0 ? (
                    filteredAssets.map((a, i) => {
                      const val = assetValue(a);
                      const faulty = getActiveFaultsForAsset(a, activeFaults, faultCtx).length > 0;
                      return (
                        <option key={val || i} value={val}>
                          {a.computerNo ? `${a.computerNo}` : `Asset #${val}`}
                          {faulty ? '  (⚠ not working)' : ''}
                        </option>
                      );
                    })
                  ) : (
                    <option value="" disabled>
                      {selectedLabId ? 'No computers found for this lab' : 'Please select a lab first'}
                    </option>
                  )}
                </select>
                {selectedAssetFaults.length > 0 && (
                  <div className="ft-note">
                    ⚠ This computer already has {selectedAssetFaults.length} open{' '}
                    {selectedAssetFaults.length === 1 ? 'ticket' : 'tickets'} (
                    {selectedAssetFaults.map((f) => `TKT-${getFaultId(f)}`).join(', ')}). Submitting will add another.
                  </div>
                )}
              </div>
            )}

            <div className="ft-field">
              <label>Priority level</label>
              <select name="priority" value={formData?.priority || 'Medium'} onChange={handleInputChange}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="ft-field">
              <label>Reporter</label>
              <input type="text" readOnly value={defaultName} />
            </div>

            <div className="ft-field full">
              <label>Issue description</label>
              <textarea
                name="description"
                value={formData?.description || ''}
                onChange={handleInputChange}
                placeholder={
                  isEquipment
                    ? 'Describe the problem, e.g. AC is not cooling, projector shows no signal...'
                    : 'Describe the hardware or software issue...'
                }
                required
              />
            </div>

            <button type="submit" disabled={submitting} className="ft-btn primary full">
              {submitting ? 'Submitting report...' : 'Submit fault report'}
            </button>
          </form>
        </section>
      )}

      {/* Section title + filter pills */}
      <div className="ft-section-head">
        <h3>Active fault tickets</h3>
        <div className="ft-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={statusFilter === t.key}
              className={`ft-tab ${statusFilter === t.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(t.key)}
            >
              {t.label} <span>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      {Object.keys(groupedFaults).length === 0 ? (
        <div className="ft-empty">No active fault reports found. All clear!</div>
      ) : (
        Object.keys(groupedFaults).map((labName) => {
          const isOpen = !closedLabs[labName];
          const list = groupedFaults[labName];

          return (
            <section key={labName} className="ft-lab">
              <div
                className="ft-lab-bar"
                onClick={() => toggleLab(labName)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleLab(labName)}
              >
                <span className="ft-lab-name">{labName}</span>
                <span className="ft-lab-right">
                  <span className="ft-lab-count">
                    {list.length} {list.length === 1 ? 'ticket' : 'tickets'}
                  </span>
                  <span className={`ft-chevron ${isOpen ? 'open' : ''}`}>›</span>
                </span>
              </div>

              {isOpen && (
                <div className="ft-table-wrap">
                  <div className="ft-table">
                    <div className="ft-row ft-thead">
                      <span>Ticket</span>
                      <span>Item</span>
                      <span>Issue</span>
                      <span>Reported by</span>
                      <span>Priority</span>
                      <span>Status</span>
                      <span>Opened</span>
                    </div>

                    {list.map((fault, index) => {
                      const reportID = fault.reportID || fault.reportId || fault.id || index + 1;
                      const currentStatus = selectedStatuses[reportID] || fault.status || 'Pending Repair';
                      const stepIdx = getStepIndex(currentStatus);
                      const equipmentFault = isEquipmentFault(fault);
                      const itemLabel = getFaultItemLabel(fault, assets);
                      const description = fault.issueDescription || fault.description || 'No description provided';
                      const rawDate =
                        fault.reportDate || fault.date || fault.createdAt || fault.created_at || new Date().toISOString();
                      const displayDate = String(rawDate).replace('T', ' ').substring(0, 19);
                      const prio = String(getPriority(fault)).toUpperCase();
                      const reporter =
                        fault.reportedBy ||
                        fault.reported_by ||
                        fault.reporterName ||
                        fault.reporter ||
                        fault.user?.fullName ||
                        fault.user?.name ||
                        fault.reportedByUser?.fullName ||
                        'Unknown';
                      const isExpanded = !!expanded[reportID];

                      return (
                        <div key={reportID} className={`ft-item ${isExpanded ? 'open' : ''}`}>
                          <div
                            className="ft-row ft-data"
                            onClick={() => toggleTicket(reportID)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleTicket(reportID)}
                          >
                            <span className="ft-id">TKT-{reportID}</span>
                           <span className="ft-item-cell" title={itemLabel}>
  <b className={`ft-pill ${equipmentFault ? 'equip' : 'pc'}`}>{itemLabel}</b>
</span>
                            <span className="ft-issue" title={description}>
                              {description}
                            </span>
                            <span className="ft-user">
                              <i className="ft-avatar">{initials(reporter)}</i>
                              <span>{reporter}</span>
                            </span>
                            <span>
                              <b className={`ft-pill ${priorityClass(prio)}`}>{prio}</b>
                            </span>
                            <span>
                              <b className={`ft-pill ${STEPS[stepIdx].cls}`}>{STEPS[stepIdx].label}</b>
                            </span>
                            <span className="ft-muted">{getTimeOpen(rawDate, now)}</span>
                          </div>

                          {isExpanded && (
                            <div className="ft-detail">
                              <StatusStepper status={currentStatus} />

                              <div className="ft-detail-grid">
                                <div className="ft-box">
                                  <small>Issue description</small>
                                  <p>{description}</p>
                                </div>
                                <div className="ft-box">
                                  <small>{equipmentFault ? 'Equipment' : 'Computer'}</small>
                                  <p>{itemLabel}</p>
                                  <small>Raised on</small>
                                  <p>{displayDate}</p>
                                  <small>Time open</small>
                                  <p>{getTimeOpen(rawDate, now)}</p>
                                </div>
                              </div>

                              {isTechnicianOrAdmin && (
                                <div className="ft-actions">
                                  <div className="ft-field inline">
                                    <label>Update status</label>
                                    <select
                                      value={currentStatus}
                                      onChange={(e) => handleTempStatusChange(reportID, e.target.value)}
                                    >
                                      <option value="Pending Repair">1. Reported (Pending Repair)</option>
                                      <option value="In Progress">2. On Process (In Progress)</option>
                                      <option value="Resolved">3. Done (Resolved)</option>
                                    </select>
                                  </div>
                                  <button className="ft-btn success" onClick={() => handleConfirmResolve(reportID)}>
                                    ✓ Mark as resolved
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

/* ---------- Styles ---------- */

const css = `
.ft-page{--maroon:#800000;--gold:#f5ab16;--ink:#1f2433;--muted:#7b8194;--line:#eceef4;--bg:#f7f7fb;
  font-family:'Inter','Segoe UI',system-ui,sans-serif;color:var(--ink);background:var(--bg);
  max-width:1200px;margin:0 auto;padding:28px 24px 48px;box-sizing:border-box}
.ft-page *{box-sizing:border-box}

.ft-header h2{margin:0;font-size:24px;font-weight:400}
.ft-header h2 strong{font-weight:700}
.ft-header p{margin:6px 0 22px;color:var(--muted);font-size:14px}

/* Tiles */
.ft-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px}
.ft-tile{position:relative;overflow:hidden;display:flex;flex-direction:column;gap:6px;padding:20px 22px;border-radius:6px;color:#fff;
  box-shadow:0 8px 20px rgba(31,36,51,.12)}
.ft-tile::after{content:'';position:absolute;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.14)}
.ft-tile-num{font-size:34px;font-weight:600;line-height:1}
.ft-tile-label{font-size:11px;letter-spacing:1.2px;text-transform:uppercase;opacity:.9}
.ft-tile.maroon{background:linear-gradient(135deg,#800000,#b0302f)}
.ft-tile.amber{background:linear-gradient(135deg,#f0b21a,#f5922a)}
.ft-tile.teal{background:linear-gradient(135deg,#12bfb6,#1fd6bd)}
.ft-tile.crimson{background:linear-gradient(135deg,#e5484d,#f2784b)}

/* Cards */
.ft-card{background:#fff;border-radius:8px;padding:24px;margin-bottom:32px;box-shadow:0 2px 12px rgba(31,36,51,.05)}
.ft-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding-bottom:14px;margin-bottom:20px;border-bottom:1px solid var(--line)}
.ft-card-head h3{margin:0;font-size:17px;color:var(--maroon)}
.ft-chip{font-size:11px;font-weight:600;color:var(--maroon);background:#fbeaea;padding:4px 12px;border-radius:999px}

/* Form */
.ft-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.ft-field label{display:block;margin-bottom:6px;font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--muted)}
.ft-field select,.ft-field input,.ft-field textarea{width:100%;padding:10px 14px;border:1px solid transparent;border-radius:8px;
  background:#f1f2f8;font-family:inherit;font-size:13px;color:var(--ink);outline:none;transition:border-color .15s,background .15s}
.ft-field textarea{min-height:90px;resize:vertical}
.ft-field select:focus,.ft-field input:focus,.ft-field textarea:focus{background:#fff;border-color:var(--gold);box-shadow:0 0 0 3px rgba(245,171,22,.2)}
.ft-field input[readonly]{color:var(--muted)}
.ft-field.full,.ft-btn.full{grid-column:1 / -1}
.ft-field.inline{display:flex;align-items:center;gap:10px}
.ft-field.inline label{margin:0;white-space:nowrap}
.ft-field.inline select{width:auto}

.ft-btn{border:none;border-radius:999px;padding:11px 22px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:filter .15s,transform .1s}
.ft-btn:hover:not(:disabled){filter:brightness(1.08)}
.ft-btn:active:not(:disabled){transform:translateY(1px)}
.ft-btn:disabled{opacity:.6;cursor:not-allowed}
.ft-btn.primary{background:var(--maroon);color:#fff}
.ft-btn.success{background:#16a34a;color:#fff}

.ft-alert{padding:11px 14px;border-radius:8px;margin-bottom:18px;font-size:13px;font-weight:600}
.ft-alert.ok{background:#e8f7ee;color:#166534;border:1px solid #bde5cb}
.ft-alert.err{background:#fdecec;color:#991b1b;border:1px solid #f5c2c2}
.ft-note{margin-top:8px;padding:8px 12px;border-radius:8px;background:#fff4d0;color:#a16207;font-size:12px;line-height:1.5}

/* Section head + tabs */
.ft-section-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px}
.ft-section-head h3{margin:0;font-size:20px}
.ft-tabs{display:flex;gap:4px;padding:4px;background:#e9ebf5;border-radius:999px}
.ft-tab{border:none;background:transparent;padding:7px 16px;border-radius:999px;font-family:inherit;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer}
.ft-tab span{margin-left:4px;opacity:.7}
.ft-tab.active{background:#fff;color:var(--maroon);box-shadow:0 1px 4px rgba(31,36,51,.12)}

/* Lab block */
.ft-lab{margin-bottom:22px;border-radius:6px;overflow:hidden;box-shadow:0 2px 12px rgba(31,36,51,.06);background:#fff}
.ft-lab-bar{display:flex;align-items:center;justify-content:space-between;padding:13px 20px;background:var(--maroon);color:#fff;cursor:pointer;user-select:none}
.ft-lab-name{font-size:15px;font-weight:600}
.ft-lab-right{display:flex;align-items:center;gap:14px}
.ft-lab-count{font-size:11px;font-weight:600;padding:4px 12px;border-radius:999px;background:rgba(255,255,255,.18)}
.ft-chevron{font-size:20px;line-height:1;transition:transform .2s}
.ft-chevron.open{transform:rotate(90deg)}

/* Table */
.ft-table-wrap{overflow-x:auto;background:#f1f2f6;padding:14px 18px 18px}
.ft-table{min-width:900px}
.ft-row{display:grid;grid-template-columns:90px 120px minmax(160px,1fr) 190px 100px 120px 110px;align-items:center;gap:12px;padding:0 18px}
.ft-thead{padding-top:4px;padding-bottom:10px;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#9aa0b3}
.ft-item{background:#fff;border-radius:6px;margin-bottom:8px;box-shadow:0 1px 3px rgba(31,36,51,.05);overflow:hidden}
.ft-item.open{box-shadow:0 4px 14px rgba(31,36,51,.1)}
.ft-data{min-height:54px;font-size:13px;cursor:pointer;transition:background .15s}
.ft-data:hover{background:#fcfcfe}
.ft-data:focus-visible{outline:2px solid var(--gold);outline-offset:-2px}
.ft-id{font-weight:700;color:var(--maroon)}
.ft-item-cell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ft-issue{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#4a5064}
.ft-muted{color:var(--muted);font-size:12px}
.ft-user{display:flex;align-items:center;gap:10px;min-width:0}
.ft-user>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ft-avatar{flex:0 0 28px;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:700;
  color:#fff;background:linear-gradient(135deg,#800000,#c0504d)}

/* Pills */
.ft-pill{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:600;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle}
.ft-pill.crit{background:#fde8e8;color:#c81e1e}
.ft-pill.high{background:#ffedd8;color:#c2570c}
.ft-pill.med{background:#fff4d0;color:#a16207}
.ft-pill.low{background:#e3f6ea;color:#15803d}
.ft-pill.amber{background:#fff4d0;color:#a16207}
.ft-pill.teal{background:#dcf7f4;color:#0f766e}
.ft-pill.green{background:#e3f6ea;color:#15803d}
.ft-pill.equip{background:#eceafd;color:#4338ca}
.ft-pill.pc{background:#fbeaea;color:#800000}

/* Detail panel */
.ft-detail{padding:20px;border-top:1px solid var(--line);background:#fcfcfe}
.ft-stepper{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
.ft-step{display:flex;align-items:center;gap:10px;padding-top:12px;position:relative;opacity:.55}
.ft-step::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;border-radius:2px;background:#e3e5ee}
.ft-step.done,.ft-step.current{opacity:1}
.ft-step.done::before{background:#16a34a}
.ft-step.current::before{background:var(--gold)}
.ft-step-dot{flex:0 0 28px;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;background:#e9ebf5;color:var(--muted)}
.ft-step.done .ft-step-dot{background:#16a34a;color:#fff}
.ft-step.current .ft-step-dot{background:var(--gold);color:#2b1a00}
.ft-step-label{font-size:13px;font-weight:600}
.ft-step-sub{font-size:11px;color:var(--muted)}

.ft-detail-grid{display:grid;grid-template-columns:2fr 1fr;gap:14px}
.ft-box{background:#f4f5fa;border-radius:8px;padding:14px 16px}
.ft-box small{display:block;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#9aa0b3}
.ft-box p{margin:4px 0 12px;font-size:13.5px;line-height:1.5}
.ft-box p:last-child{margin-bottom:0}

.ft-actions{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--line)}

.ft-empty{background:#fff;border:2px dashed #d9dcea;border-radius:10px;padding:40px;text-align:center;color:var(--muted);font-size:15px}

@media (max-width:720px){
  .ft-page{padding:20px 14px 40px}
  .ft-stepper,.ft-detail-grid{grid-template-columns:1fr}
}
`;

export default FaultTickets;