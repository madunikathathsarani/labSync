import React from 'react';

// Map shown in the footer.
// To point at the exact building: open it in Google Maps -> Share -> "Embed a map",
// then copy ONLY the src="..." link from that code and paste it here.
const MAP_EMBED_SRC =
  'https://www.google.com/maps?q=Sabaragamuwa+University+of+Sri+Lanka,+Belihuloya&output=embed';

// Opens Google Maps in a new tab with directions to the same place
const MAP_DIRECTIONS_URL =
  'https://www.google.com/maps/search/?api=1&query=Sabaragamuwa+University+of+Sri+Lanka+Belihuloya';

const css = `
.ft-foot-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1.7fr; gap:24px; }
.ft-foot-map { width:100%; height:200px; border:0; border-radius:8px; display:block; background:#0f172a; }
.ft-foot a:hover { color:#f5ab16; }
@media (max-width:1000px) { .ft-foot-grid { grid-template-columns:repeat(2, minmax(0,1fr)); } .ft-foot-mapcol { grid-column:1 / -1; } }
@media (max-width:600px) { .ft-foot-grid { grid-template-columns:1fr; } }
`;

function Footer() {
  return (
    <footer
      className="ft-foot"
      style={{
        backgroundColor: '#1e293b',
        color: '#cbd5e1',
        paddingTop: '30px',
        paddingBottom: '15px',
        marginTop: '40px',
        borderRadius: '8px 8px 0 0',
        fontSize: '13px'
      }}
    >
      <style>{css}</style>

      <div
        className="ft-foot-grid"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px'
        }}
      >
        {/* Column 1: About */}
        <div>
          <h4 style={{ color: '#f5ab16', marginTop: 0, marginBottom: '12px' }}>LabSync Portal</h4>
          <p style={{ lineHeight: '1.6', margin: 0 }}>
            Department of Information Technology,<br />
            Faculty of Social Sciences & Languages,<br />
            Sabaragamuwa University of Sri Lanka.
          </p>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h4 style={{ color: '#f5ab16', marginTop: 0, marginBottom: '12px' }}>Quick Links</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: '2.0' }}>
            <li><a href="https://www.sab.ac.lk" target="_blank" rel="noreferrer" style={{ color: '#cbd5e1', textDecoration: 'none' }}>SUSL Main Website</a></li>
            <li><a href="https://vle.sab.ac.lk" target="_blank" rel="noreferrer" style={{ color: '#cbd5e1', textDecoration: 'none' }}>University VLE Portal</a></li>
            <li><a href="#about" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Lab Regulations</a></li>
          </ul>
        </div>

        {/* Column 3: Contact Info */}
        <div>
          <h4 style={{ color: '#f5ab16', marginTop: 0, marginBottom: '12px' }}>Contact Us</h4>
          <p style={{ margin: '4px 0' }}>📍 Belihuloya, 70140, Sri Lanka</p>
          <p style={{ margin: '4px 0' }}>📞 Phone: +94 (0)45 2280000</p>
          <p style={{ margin: '4px 0' }}>✉️ Email: dit@ssl.sab.ac.lk</p>
        </div>

        {/* Column 4: Campus map */}
        <div className="ft-foot-mapcol">
          <h4 style={{ color: '#f5ab16', marginTop: 0, marginBottom: '12px' }}>Find Us</h4>
          <iframe
            className="ft-foot-map"
            title="Sabaragamuwa University of Sri Lanka campus map"
            src={MAP_EMBED_SRC}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <a
            href={MAP_DIRECTIONS_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-block',
              marginTop: '10px',
              color: '#f5ab16',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Get directions →
          </a>
        </div>
      </div>

      {/* Copyright Line */}
      <div style={{
        borderTop: '1px solid #334155',
        marginTop: '25px',
        paddingTop: '15px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#94a3b8'
      }}>
        © {new Date().getFullYear()} Department of Information Technology - SUSL. All Rights Reserved.
      </div>
    </footer>
  );
}

export default Footer;