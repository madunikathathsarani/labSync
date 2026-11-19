import React, { useState } from 'react';

// 📸 Import images directly from `src`
import cc1_1 from './cc1_1.jpg';
import cc1_2 from './cc1_2.jpg';
import cc2_1 from './cc2_1.jpg';
import cc2_2 from './cc2_2.jpg';
import a5_1 from './a5_1.jpg';
import a5_2 from './a5_2.jpg';

const LAB_OPTIONS = ['CC1 Lab', 'CC2 Lab', 'A5 Lab'];

/* ---------- Helpers ---------- */

const getLabId = (lab, idx) => lab.labId || lab.id || lab.labID || idx + 1;
const getLabName = (lab) => lab.labName || lab.name || '';

const getLabImages = (lab, idx) => {
  const labName = String(getLabName(lab)).toUpperCase();
  const labId = String(getLabId(lab, idx));

  if (labName.includes('CC1') || labId === '1') return [cc1_1, cc1_2];
  if (labName.includes('CC2') || labId === '2') return [cc2_1, cc2_2];
  if (labName.includes('A5') || labId === '3') return [a5_1, a5_2];

  return [
    'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&auto=format&fit=crop'
  ];
};

// "CC1" -> "CC1 Lab" (matches the tab values used by the parent)
const toOption = (lab) => {
  const name = getLabName(lab);
  return name.toLowerCase().includes('lab') ? name : `${name} Lab`;
};

const CLOSED = ['resolved', 'fixed', 'done', 'closed', 'completed'];

/* ---------- Image gallery ---------- */

const LabGallery = ({ images, labName }) => {
  const [index, setIndex] = useState(0);
  const prev = () => setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="lb-gallery">
      <div className="lb-stage">
        <img src={images[index]} alt={`${labName} view ${index + 1}`} />
        {images.length > 1 && (
          <>
            <button type="button" className="lb-arrow left" onClick={prev} aria-label="Previous photo">‹</button>
            <button type="button" className="lb-arrow right" onClick={next} aria-label="Next photo">›</button>
          </>
        )}
        <span className="lb-count">
          {index + 1} / {images.length}
        </span>
      </div>

      {images.length > 1 && (
        <div className="lb-thumbs">
          {images.map((src, i) => (
            <button
              type="button"
              key={i}
              className={i === index ? 'active' : ''}
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------- Main component ---------- */

function Labs({ labs = [], selectedLab, setSelectedLab, faults = [] }) {
  // "" or "ALL" means no single lab is chosen -> show the overview of all labs
  const currentActiveLab =
    selectedLab && String(selectedLab).trim().toUpperCase() !== 'ALL' ? selectedLab : '';

  const filteredLabs = currentActiveLab
    ? labs.filter((lab) => {
        const name = getLabName(lab).toLowerCase();
        const id = String(lab.labId || lab.id || lab.labID || '');
        const filterStr = currentActiveLab.toLowerCase().replace(' lab', '');
        return name.includes(filterStr) || id === currentActiveLab || name === currentActiveLab.toLowerCase();
      })
    : [];

  // Number of unresolved fault tickets for a lab
  const openFaultCount = (labId) =>
    Array.isArray(faults)
      ? faults.filter((f) => {
          const fLabId = f.labID || f.labId || f.lab_id || f.lab?.labID || f.lab?.labId || f.lab?.id;
          return String(fLabId) === String(labId) && !CLOSED.includes(String(f.status || '').toLowerCase());
        }).length
      : 0;

  const statusOf = (lab, labId) => {
    const open = openFaultCount(labId);
    if (open > 0) return { text: 'Faulty', cls: 'red', open };
    const text = lab.status || 'Active';
    return { text, cls: String(text).toLowerCase() === 'active' ? 'green' : 'amber', open };
  };

  /* ---------- Views ---------- */

  const renderOverview = () => (
    <div className="lb-cards">
      {labs.length === 0 ? (
        <div className="lb-empty">No laboratories found.</div>
      ) : (
        labs.map((lab, idx) => {
          const labId = getLabId(lab, idx);
          const st = statusOf(lab, labId);
          return (
            <article key={labId} className="lb-card">
              <div className="lb-card-img">
                <img src={getLabImages(lab, idx)[0]} alt={getLabName(lab)} />
                <b className={`lb-pill ${st.cls}`}>{st.text}</b>
              </div>
              <div className="lb-card-body">
                <h3>{getLabName(lab) || `Lab ${labId}`}</h3>
                <p>{lab.location || 'Department of IT'}</p>
                <div className="lb-card-meta">
                  <span><strong>{lab.computerNo || lab.capacity || 40}</strong> seats</span>
                  <span><strong>{st.open}</strong> open {st.open === 1 ? 'ticket' : 'tickets'}</span>
                </div>
                {setSelectedLab && (
                  <button type="button" className="lb-btn" onClick={() => setSelectedLab(toOption(lab))}>
                    View details
                  </button>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  );

  const renderDetail = () =>
    filteredLabs.length === 0 ? (
      <div className="lb-empty">
        No laboratory information found for <strong>{currentActiveLab}</strong>.
      </div>
    ) : (
      filteredLabs.map((lab, idx) => {
        const images = getLabImages(lab, idx);
        const title = getLabName(lab) || currentActiveLab;
        const labId = getLabId(lab, idx);
        const capacity = lab.computerNo || lab.capacity || 40;
        const st = statusOf(lab, labId);

        return (
          <div key={labId} className="lb-detail">
            <LabGallery key={labId} images={images} labName={title} />

            <div className="lb-info">
              <div className="lb-info-head">
                <div>
                  <span className="lb-id">Lab ID: {labId}</span>
                  <h3>{title}</h3>
                </div>
                <b className={`lb-pill ${st.cls}`}>{st.text}</b>
              </div>

              {st.open > 0 && (
                <div className="lb-alert">
                  {st.open} open fault {st.open === 1 ? 'ticket' : 'tickets'} reported for this lab. Check the Faults tab for details.
                </div>
              )}

              <div className="lb-tiles">
                <div className="lb-tile maroon">
                  <span className="lb-tile-num">{capacity}</span>
                  <span className="lb-tile-label">Computer capacity</span>
                </div>
                <div className={`lb-tile ${st.open > 0 ? 'crimson' : 'teal'}`}>
                  <span className="lb-tile-num">{st.open}</span>
                  <span className="lb-tile-label">Open fault tickets</span>
                </div>
              </div>

              <dl className="lb-facts">
                <div>
                  <dt>Location</dt>
                  <dd>{lab.location || 'Department of IT'}</dd>
                </div>
                <div>
                  <dt>Computer No / Capacity</dt>
                  <dd>{capacity}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd><b className={`lb-pill ${st.cls}`}>{st.text}</b></dd>
                </div>
              </dl>
            </div>
          </div>
        );
      })
    );

  return (
    <div className="lb-page">
      <style>{css}</style>

      <header className="lb-header">
        <div>
          <h2>
            Published Labs{currentActiveLab ? <strong> / {currentActiveLab}</strong> : null}
          </h2>
          <p>Overview of computer laboratories in the Department of Information Technology.</p>
        </div>

        {setSelectedLab && (
          <div className="lb-tabs" role="tablist" aria-label="Select laboratory">
            <button
              type="button"
              role="tab"
              aria-selected={!currentActiveLab}
              className={!currentActiveLab ? 'active' : ''}
              onClick={() => setSelectedLab('')}
            >
              All labs
            </button>
            {LAB_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt}
                role="tab"
                aria-selected={currentActiveLab === opt}
                className={currentActiveLab === opt ? 'active' : ''}
                onClick={() => setSelectedLab(opt)}
              >
                {opt.replace(' Lab', '')}
              </button>
            ))}
          </div>
        )}
      </header>

      {currentActiveLab ? renderDetail() : renderOverview()}
    </div>
  );
}

/* ---------- Styles ---------- */

const css = `
.lb-page{--maroon:#800000;--gold:#f5ab16;--ink:#1f2433;--muted:#7b8194;--line:#eceef4;--bg:#f7f7fb;
  font-family:'Inter','Segoe UI',system-ui,sans-serif;color:var(--ink);background:var(--bg);
  max-width:1200px;margin:0 auto;padding:28px 24px 48px;box-sizing:border-box}
.lb-page *{box-sizing:border-box}

.lb-header{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:24px}
.lb-header h2{margin:0;font-size:24px;font-weight:400}
.lb-header h2 strong{font-weight:700}
.lb-header p{margin:6px 0 0;color:var(--muted);font-size:14px}

.lb-tabs{display:flex;gap:2px;padding:4px;background:#e9ebf5;border-radius:999px}
.lb-tabs button{border:none;background:transparent;padding:8px 18px;border-radius:999px;font-family:inherit;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer}
.lb-tabs button.active{background:var(--maroon);color:#fff;box-shadow:0 2px 6px rgba(128,0,0,.25)}

/* Detail layout */
.lb-detail{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:24px;align-items:start;margin-bottom:24px}

/* Gallery */
.lb-gallery{background:#fff;border-radius:10px;padding:12px;box-shadow:0 2px 12px rgba(31,36,51,.06)}
.lb-stage{position:relative;aspect-ratio:4 / 3;border-radius:8px;overflow:hidden;background:#eceef4}
.lb-stage img{width:100%;height:100%;object-fit:cover;display:block}
.lb-arrow{position:absolute;top:50%;transform:translateY(-50%);width:38px;height:38px;border:none;border-radius:50%;background:rgba(31,36,51,.65);color:#fff;font-size:22px;line-height:1;cursor:pointer;display:grid;place-items:center;transition:background .15s}
.lb-arrow:hover{background:rgba(128,0,0,.9)}
.lb-arrow.left{left:12px}
.lb-arrow.right{right:12px}
.lb-count{position:absolute;right:12px;bottom:12px;padding:3px 10px;border-radius:999px;background:rgba(31,36,51,.7);color:#fff;font-size:11px;font-weight:600}
.lb-thumbs{display:flex;gap:10px;margin-top:12px}
.lb-thumbs button{width:84px;height:62px;padding:0;border:2px solid transparent;border-radius:8px;overflow:hidden;cursor:pointer;opacity:.6;background:none;transition:opacity .15s,border-color .15s}
.lb-thumbs button.active{border-color:var(--gold);opacity:1}
.lb-thumbs img{width:100%;height:100%;object-fit:cover;display:block}

/* Info panel */
.lb-info{background:#fff;border-radius:10px;padding:24px;box-shadow:0 2px 12px rgba(31,36,51,.06)}
.lb-info-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding-bottom:16px;margin-bottom:18px;border-bottom:1px solid var(--line)}
.lb-info-head h3{margin:6px 0 0;font-size:26px;color:var(--maroon)}
.lb-id{font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted)}
.lb-alert{padding:11px 14px;margin-bottom:18px;border-radius:8px;font-size:13px;line-height:1.5;background:#fdecec;color:#991b1b;border:1px solid #f5c2c2}

.lb-tiles{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}
.lb-tile{position:relative;overflow:hidden;display:flex;flex-direction:column;gap:6px;padding:18px 20px;border-radius:6px;color:#fff;box-shadow:0 8px 20px rgba(31,36,51,.12)}
.lb-tile::after{content:'';position:absolute;right:-26px;top:-26px;width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.14)}
.lb-tile-num{font-size:32px;font-weight:600;line-height:1}
.lb-tile-label{font-size:11px;letter-spacing:1.1px;text-transform:uppercase;opacity:.9}
.lb-tile.maroon{background:linear-gradient(135deg,#800000,#b0302f)}
.lb-tile.teal{background:linear-gradient(135deg,#12bfb6,#1fd6bd)}
.lb-tile.crimson{background:linear-gradient(135deg,#e5484d,#f2784b)}

.lb-facts{margin:0}
.lb-facts>div{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);font-size:14px}
.lb-facts>div:last-child{border-bottom:none}
.lb-facts dt{color:var(--muted);font-size:12px;font-weight:600;letter-spacing:.5px;text-transform:uppercase}
.lb-facts dd{margin:0;font-weight:600;text-align:right}

/* Pills */
.lb-pill{display:inline-block;padding:4px 14px;border-radius:999px;font-size:12px;font-weight:700}
.lb-pill.green{background:#e3f6ea;color:#15803d}
.lb-pill.red{background:#fde8e8;color:#c81e1e}
.lb-pill.amber{background:#fff4d0;color:#a16207}

/* Overview cards */
.lb-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px}
.lb-card{background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(31,36,51,.06);transition:box-shadow .2s,transform .2s}
.lb-card:hover{box-shadow:0 10px 26px rgba(31,36,51,.12);transform:translateY(-2px)}
.lb-card-img{position:relative;aspect-ratio:16 / 10;background:#eceef4}
.lb-card-img img{width:100%;height:100%;object-fit:cover;display:block}
.lb-card-img .lb-pill{position:absolute;top:12px;right:12px;box-shadow:0 2px 6px rgba(0,0,0,.15)}
.lb-card-body{padding:18px 20px 20px}
.lb-card-body h3{margin:0;font-size:20px;color:var(--maroon)}
.lb-card-body p{margin:4px 0 14px;font-size:13px;color:var(--muted)}
.lb-card-meta{display:flex;gap:18px;padding:12px 0;margin-bottom:14px;border-top:1px solid var(--line);font-size:13px;color:#4a5064}
.lb-btn{width:100%;border:none;border-radius:999px;padding:10px;background:var(--maroon);color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:filter .15s}
.lb-btn:hover{filter:brightness(1.12)}

.lb-empty{grid-column:1 / -1;background:#fff;border:2px dashed #d9dcea;border-radius:10px;padding:40px;text-align:center;color:var(--muted);font-size:15px}

@media (max-width:900px){
  .lb-detail{grid-template-columns:1fr}
}
@media (max-width:560px){
  .lb-page{padding:20px 14px 40px}
  .lb-tiles{grid-template-columns:1fr}
}
`;

export default Labs;