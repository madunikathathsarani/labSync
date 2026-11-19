import React, { useState, useEffect, useRef } from 'react';
import logoImg from './logo.png';
import banner1 from './banner1.png';
import banner2 from './banner2.png';
import banner3 from './banner3.jpg';
import Footer from './Footer';

const SLIDES = [
  { img: banner1, title: 'WELCOME', sub: 'The LabSync portal: computer labs, fault tickets and reservations in one place.' },
  { img: banner2, title: 'Computer Labs & Reservation', sub: 'Explore our lab facilities and book your lecture sessions with ease.' },
  { img: banner3, title: 'Department of Information Technology', sub: 'Faculty of Social Sciences and Languages, Sabaragamuwa University of Sri Lanka.' },
];

// How long each banner stays on screen (milliseconds). Smaller = faster.
const SLIDE_MS = 3500;

const FEATURES = [
  { icon: '🖥️', title: 'Computer Labs', text: 'See every lab, its computers, specifications and installed software on an interactive lab map.' },
  { icon: '🛠️', title: 'Fault Tickets', text: 'Report a faulty computer or lab equipment and follow the repair from Reported to Done.' },
  { icon: '📅', title: 'Lab Reservations', text: 'Check the weekly timetable and request extra lecture sessions when a lab is free.' },
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&display=swap');

.lp { --maroon:#a31f2c; --maroon-d:#7d1420; --gold:#f5ab16; --ink:#1f2433; --muted:#6b7280; --bg:#f4f6f9; --line:#e8eaf0;
  font-family:'Inter','Segoe UI',system-ui,sans-serif; color:var(--ink); background:#fff; }
.lp * { box-sizing:border-box; }
.lp-wrap { max-width:1200px; margin:0 auto; padding:0 20px; }
.lp button:focus-visible, .lp a:focus-visible { outline:2px solid var(--gold); outline-offset:2px; }

/* top bar (same look as the portal) */
.lp-top { background:var(--gold); color:#fff; font-size:11px; font-weight:700; }
.lp-top .lp-wrap { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-top:6px; padding-bottom:6px; max-width:none; padding-left:40px; padding-right:40px; }
.lp-links { display:flex; gap:15px; align-items:center; flex-wrap:wrap; }
.lp-links a { color:#fff; text-decoration:none; }
.lp-links a:hover { text-decoration:underline; }
.lp-login { border:0; background:#c02425; color:#fff; padding:6px 18px; border-radius:4px; font:inherit; font-size:12px; font-weight:700; cursor:pointer; }
.lp-login:hover { background:#a51d1e; }

/* main header */
.lp-head { background:linear-gradient(90deg,#7d1420 0%,#5a0f19 100%); border-bottom:3px solid var(--gold); }
.lp-head .lp-wrap { display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap; padding-top:12px; padding-bottom:12px; max-width:none; padding-left:40px; padding-right:40px; }
.lp-brand { display:flex; align-items:center; gap:18px; }
.lp-brand img { height:54px; width:54px; object-fit:contain; background:#fff; border-radius:50%; padding:3px; flex:none; }
.lp-brand h1 { margin:0; color:#fff; font-size:19px; font-weight:700; }
.lp-brand h4 { margin:2px 0 0; color:rgba(255,255,255,.82); font-size:11.5px; font-weight:600; line-height:1.3; }
.lp-nav { display:flex; gap:8px; align-items:center; }
.lp-nav a { color:#fff; text-decoration:none; font-size:13px; font-weight:700; padding:8px 14px; border-radius:4px; border-bottom:2px solid transparent; }
.lp-nav a:hover { background:rgba(255,255,255,.12); border-bottom-color:var(--gold); }
.lp-nav button { border:0; background:var(--gold); color:#fff; padding:9px 20px; border-radius:4px; font:inherit; font-size:13px; font-weight:700; cursor:pointer; }
.lp-nav button:hover { filter:brightness(1.07); }

/* hero */
.lp-hero { position:relative; height:520px; overflow:hidden; background:#241014; }
.lp-slide { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0; transform:scale(1.04); transition:opacity .9s ease, transform 6s ease; }
.lp-slide.on { opacity:1; transform:scale(1); }
.lp-shade { position:absolute; inset:0; background:linear-gradient(90deg, rgba(58,10,16,.88) 0%, rgba(58,10,16,.55) 48%, rgba(0,0,0,.12) 100%); }
.lp-hero-in { position:absolute; inset:0; display:flex; align-items:center; }
.lp-copy { max-width:620px; padding-bottom:30px; }
.lp-eyebrow { display:inline-block; margin-bottom:14px; padding:5px 12px; border-left:3px solid var(--gold); background:rgba(255,255,255,.12); color:#fff; font-size:12px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; }
.lp-hero h2 { margin:0 0 14px; font-family:'Oswald','Bebas Neue',Impact,sans-serif; font-weight:600; letter-spacing:.5px; color:#fff; font-size:clamp(32px,5vw,58px); line-height:1.1; text-shadow:0 2px 12px rgba(0,0,0,.3); }
.lp-hero p { margin:0 0 26px; max-width:520px; font-size:16px; line-height:1.7; color:rgba(255,255,255,.9); }
.lp-cta { display:flex; flex-wrap:wrap; gap:12px; }
.lp-btn { padding:12px 26px; border:2px solid transparent; border-radius:999px; font:inherit; font-size:14px; font-weight:700; cursor:pointer; text-decoration:none; display:inline-block; }
.lp-btn.gold { background:var(--gold); color:#2b1a00; }
.lp-btn.gold:hover { filter:brightness(1.08); }
.lp-btn.ghost { background:transparent; color:#fff; border-color:rgba(255,255,255,.7); }
.lp-btn.ghost:hover { background:rgba(255,255,255,.14); }
.lp-arrow { position:absolute; top:50%; transform:translateY(-50%); width:42px; height:42px; display:grid; place-items:center; border:1px solid rgba(255,255,255,.4); border-radius:50%; background:rgba(255,255,255,.14); color:#fff; font-size:22px; line-height:1; cursor:pointer; }
.lp-arrow:hover { background:rgba(255,255,255,.3); }
.lp-arrow.l { left:20px; } .lp-arrow.r { right:20px; }
.lp-dots { position:absolute; left:50%; bottom:22px; transform:translateX(-50%); display:flex; gap:8px; }
.lp-dot { width:28px; height:4px; padding:0; border:0; border-radius:2px; background:rgba(255,255,255,.45); cursor:pointer; transition:background .2s, width .2s; }
.lp-dot.on { background:var(--gold); width:40px; }

/* scroll animation */
.lp-rv { opacity:0; transition:opacity .75s ease, transform .75s cubic-bezier(.2,.7,.2,1); will-change:opacity, transform; }
.lp-rv-up { transform:translateY(46px); }
.lp-rv-left { transform:translateX(-70px); }
.lp-rv-right { transform:translateX(70px); }
.lp-rv-zoom { transform:scale(.9); }
.lp-rv.in { opacity:1; transform:none; }

/* hero text animates in every time the banner changes */
@keyframes lp-rise { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:none; } }
.lp-copy > * { animation:lp-rise .7s cubic-bezier(.2,.7,.2,1) both; }
.lp-copy > *:nth-child(2) { animation-delay:.08s; }
.lp-copy > *:nth-child(3) { animation-delay:.16s; }
.lp-copy > *:nth-child(4) { animation-delay:.24s; }

/* features */
.lp-feat { background:var(--bg); padding:0 0 56px; }
.lp-feat-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; margin-top:-48px; position:relative; }
.lp-card { background:#fff; border-top:4px solid var(--maroon); border-radius:8px; padding:24px; box-shadow:0 10px 30px rgba(31,36,51,.12); }
.lp-card i { display:grid; place-items:center; width:48px; height:48px; border-radius:12px; background:#fbe9ea; font-style:normal; font-size:24px; margin-bottom:12px; }
.lp-card h3 { margin:0 0 8px; font-size:17px; color:var(--maroon-d); }
.lp-card p { margin:0; font-size:14px; line-height:1.7; color:var(--muted); }
.lp-feat-cta { margin-top:32px; text-align:center; }
.lp-feat-cta p { margin:0 0 14px; color:var(--muted); font-size:15px; }
.lp-feat-cta .lp-btn { background:var(--maroon); color:#fff; }
.lp-feat-cta .lp-btn:hover { background:var(--maroon-d); }

/* sections */
.lp-sec { padding:64px 0; background:#fff; }
.lp-sec.alt { background:var(--bg); }
.lp-sh { margin-bottom:34px; }
.lp-sh span { display:block; margin-bottom:8px; font-size:12px; font-weight:700; letter-spacing:1.6px; text-transform:uppercase; color:var(--maroon); }
.lp-sh h2 { margin:0; font-size:clamp(26px,3.2vw,34px); font-weight:800; color:#111827; }
.lp-sh h2::after { content:''; display:block; width:56px; height:4px; margin-top:12px; border-radius:2px; background:var(--gold); }
.lp-about { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.3fr); gap:44px; align-items:center; }
.lp-photo { position:relative; min-height:340px; overflow:hidden; border-radius:12px; box-shadow:0 14px 34px rgba(31,36,51,.18); }
.lp-photo img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.lp-photo span { position:absolute; left:0; bottom:0; padding:10px 20px; border-top-right-radius:10px; background:var(--maroon); color:#fff; font-size:12px; font-weight:700; letter-spacing:1px; }
.lp-text p { margin:0 0 16px; font-size:15.5px; line-height:1.85; color:#4b5563; }
.lp-invite { margin-top:20px; padding:16px 20px; border-left:4px solid var(--maroon); border-radius:0 8px 8px 0; background:#fbf3f4; color:var(--maroon-d); font-weight:600; line-height:1.7; }
.lp-facts { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:24px; }
.lp-fact { padding:30px 24px; text-align:center; background:#fff; border-radius:10px; border-bottom:4px solid var(--maroon); box-shadow:0 2px 14px rgba(31,36,51,.06); }
.lp-fact b { display:block; font-size:44px; font-weight:800; line-height:1; color:var(--maroon); }
.lp-fact h3 { margin:12px 0 6px; font-size:14px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#111827; }
.lp-fact p { margin:0 auto; max-width:280px; font-size:14px; line-height:1.6; color:var(--muted); }

@media (max-width:1000px) { .lp-feat-grid, .lp-facts { grid-template-columns:1fr; } .lp-about { grid-template-columns:1fr; } .lp-photo { min-height:260px; } .lp-feat-grid { margin-top:-30px; } }
@media (max-width:700px) {
  .lp-top .lp-wrap, .lp-head .lp-wrap { padding-left:16px; padding-right:16px; }
  .lp-hero { height:460px; } .lp-arrow { display:none; } .lp-hero p { font-size:14.5px; } .lp-nav a { display:none; }
}
@media (prefers-reduced-motion:reduce) { .lp * { transition:none !important; animation:none !important; } .lp-rv { opacity:1; transform:none; } }
`;

/* Fades + slides an element in the first time it scrolls into view.
   from: 'up' | 'left' | 'right' | 'zoom'     delay: milliseconds (use it to stagger several boxes) */
function Reveal({ children, from = 'up', delay = 0, className = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      setShown(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`lp-rv lp-rv-${from} ${shown ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function Landing({ onLoginClick }) {
  const [idx, setIdx] = useState(0);

  // Auto-change: moves to the next banner after SLIDE_MS, forever (no pausing).
  // It restarts every time the banner changes, so clicking an arrow or a dot keeps the auto-change going.
  useEffect(() => {
    const t = setTimeout(() => setIdx((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [idx]);

  const prev = () => setIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setIdx((i) => (i + 1) % SLIDES.length);
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="lp">
      <style>{css}</style>

      {/* Top bar */}
      <div className="lp-top">
        <div className="lp-wrap">
          <div className="lp-links">
            <a href="https://www.sab.ac.lk" target="_blank" rel="noreferrer">SUSL</a><span>|</span>
            <a href="https://vle.sab.ac.lk" target="_blank" rel="noreferrer">VLE</a><span>|</span>
            <a href="https://exam.ssl.sab.ac.lk/" target="_blank" rel="noreferrer">Exam VLE</a><span>|</span>
            <a href="#top" onClick={(e) => e.preventDefault()}>Student Portal</a>
          </div>
          <button type="button" className="lp-login" onClick={onLoginClick}>Log in</button>
        </div>
      </div>

      {/* Header */}
      <header className="lp-head" id="top">
        <div className="lp-wrap">
          <div className="lp-brand">
            <img src={logoImg} alt="SUSL logo" />
            <div>
              <h1>Social Sciences & Languages</h1>
              <h4>Sabaragamuwa University of Sri Lanka<br />Department of Information Technology</h4>
            </div>
          </div>
          <nav className="lp-nav" aria-label="Main">
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollTo('about'); }}>ABOUT</a>
            <a href="#glance" onClick={(e) => { e.preventDefault(); scrollTo('glance'); }}>AT A GLANCE</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero" aria-roledescription="carousel" aria-label="Department banners">
        {SLIDES.map((s, i) => (
          <img key={i} src={s.img} alt="" className={`lp-slide ${i === idx ? 'on' : ''}`} aria-hidden={i !== idx} />
        ))}
        <div className="lp-shade" />
        <div className="lp-hero-in">
          <div className="lp-wrap" style={{ width: '100%' }}>
            <div className="lp-copy" key={idx} aria-live="polite">
              <span className="lp-eyebrow">LabSync Management Portal</span>
              <h2>{SLIDES[idx].title}</h2>
              <p>{SLIDES[idx].sub}</p>
              <div className="lp-cta">
                <button type="button" className="lp-btn gold" onClick={() => scrollTo('about')}>Learn more</button>
              </div>
            </div>
          </div>
        </div>
        <button type="button" className="lp-arrow l" onClick={prev} aria-label="Previous banner">‹</button>
        <button type="button" className="lp-arrow r" onClick={next} aria-label="Next banner">›</button>
        <div className="lp-dots">
          {SLIDES.map((_, i) => (
            <button key={i} type="button" className={`lp-dot ${i === idx ? 'on' : ''}`}
              onClick={() => setIdx(i)} aria-label={`Show banner ${i + 1}`} aria-current={i === idx} />
          ))}
        </div>
      </section>

      {/* What you can do */}
      <section className="lp-feat" aria-label="What LabSync offers">
        <div className="lp-wrap">
          <div className="lp-feat-grid">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} className="lp-card" from="up" delay={i * 140}>
                <i aria-hidden>{f.icon}</i>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="lp-feat-cta" from="up" delay={120}>
            <p>Lecturers, technicians and administrators: use the <b>Log in</b> button at the top right to continue.</p>
          </Reveal>
        </div>
      </section>

      {/* About */}
      <section className="lp-sec" id="about">
        <div className="lp-wrap">
          <Reveal className="lp-sh" from="up"><span>Who we are</span><h2>About the Department</h2></Reveal>
          <div className="lp-about">
            <Reveal className="lp-photo" from="left">
              <img src={banner3} alt="Department of Information Technology" />
              <span>SABARAGAMUWA UNIVERSITY OF SRI LANKA</span>
            </Reveal>
            <Reveal className="lp-text" from="right" delay={120}>
              <p>
                The Department of Information Technology is the sixth Department attached to the Faculty of Social Sciences and Languages at the Sabaragamuwa University of Sri Lanka. Established under Gazette Extraordinary No. 1903/63 on February 27, 2015, it continues to strengthen instruction and research in IT, with the aim of producing highly skilled graduates who have comprehensive computing knowledge.
              </p>
              <p>
                To support this vision and simplify daily laboratory operations, the LabSync Management Portal was introduced. It gives faculty members and technical staff real time Computer monitoring, automated fault ticket tracking and seamless lab reservations, creating an efficient, technology-ready learning environment for all knowledge seekers.
              </p>
              <div className="lp-invite">
                The Department warmly invites knowledge seekers to join us and seize the opportunities to learn and practise IT applications.
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* At a glance */}
      <section className="lp-sec alt" id="glance">
        <div className="lp-wrap">
          <Reveal className="lp-sh" from="up"><span>Key facts</span><h2>Department at a Glance</h2></Reveal>
          <div className="lp-facts">
            <Reveal className="lp-fact" from="zoom" delay={0}><b>2015</b><h3>Established</h3><p>February 27, 2015, under Gazette Extraordinary No. 1903/63</p></Reveal>
            <Reveal className="lp-fact" from="zoom" delay={150}><b>6th</b><h3>Department</h3><p>The sixth Department of the Faculty of Social Sciences and Languages</p></Reveal>
            <Reveal className="lp-fact" from="zoom" delay={300}><b>SUSL</b><h3>University</h3><p>Sabaragamuwa University of Sri Lanka</p></Reveal>
          </div>
        </div>
      </section>

      <Reveal from="up">
        <Footer />
      </Reveal>
    </div>
  );
}

export default Landing;