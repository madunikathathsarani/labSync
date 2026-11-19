import React, { useState, useEffect, useRef } from 'react';
import {
  getActiveFaultsForAsset,
  getTopFault,
  getFaultId,
  getFaultPriority,
  getAssetLabId,
  getAssetId,
  getLabId
} from './Faultutils';

const API = 'http://localhost:8080/api/assets';

const EMPTY_PC = {
  computerNo: '',
  assetTag: '',
  processor: '',
  ram: '',
  storage: '',
  installedSoftwares: '',
  requiredSoftwares: '',
};

const PRIORITY_COLORS = {
  CRITICAL: { bg: '#fde8e8', fg: '#c81e1e' },
  HIGH: { bg: '#ffedd8', fg: '#c2570c' },
  MEDIUM: { bg: '#fff4d0', fg: '#a16207' },
  LOW: { bg: '#e3f6ea', fg: '#15803d' },
};

/* =====================================================================
   LAB FLOOR PLANS  (drawn from the hand sketches)
   Each "desk" is one row/column of computers. Computers are numbered
   1, 2, 3 ... in the order the desks are listed below.
     dir:'h'  horizontal desk, side:'up' | 'down'  = which side the PCs sit
     dir:'v'  vertical desk,   side:'left' | 'right'
     count    number of computers on that desk
     reverse  true = number the desk from the other end
   To change the numbering order, reorder the desks or use "reverse".
   Computers whose number has no circle on the plan are shown in the
   "Other computers" list under the map.
   ===================================================================== */
// <layouts>
const R = 15;
const OFF = R + 8;

const LAYOUTS = {
  CC1: {
    w: 820, h: 1000,
    furniture: [
      { kind: 'projector', x: 40, y: 40, w: 220, h: 170, label: 'Projector' },
      { kind: 'cabin', x: 20, y: 600, w: 250, h: 330, label: 'Department head cabin' },
      { kind: 'door', x: 190, y: 978, w: 140, h: 26, label: 'Door' },
    ],
    desks: [
      { x: 540, y: 70, dir: 'h', side: 'down', count: 7 },
      { x: 360, y: 250, dir: 'h', side: 'up', count: 12 },
      { x: 360, y: 370, dir: 'h', side: 'down', count: 12 },
      { x: 150, y: 270, dir: 'v', side: 'right', count: 5 },
      { x: 369, y: 580, dir: 'v', side: 'left', count: 6, spacing: 52 },
      { x: 435, y: 580, dir: 'v', side: 'right', count: 6, spacing: 52 },
      { x: 607, y: 580, dir: 'v', side: 'left', count: 6, spacing: 52 },
      { x: 697, y: 580, dir: 'v', side: 'right', count: 6, spacing: 52 },
    ],
  },

  A5: {
    w: 900, h: 830,
    furniture: [
      { kind: 'projector', x: 766, y: 235, w: 68, h: 311, label: 'Smart PC / Projector', vertical: true },
      { kind: 'arrow', x: 806, y: 55, w: 56, h: 120 },
      { kind: 'door', x: 700, y: 797, w: 130, h: 26, label: 'Door' },
    ],
    desks: [
      { x: 195, y: 103, dir: 'h', side: 'up', count: 10, spacing: 54 },
      { x: 195, y: 169, dir: 'h', side: 'down', count: 10, spacing: 54 },
      { x: 195, y: 316, dir: 'h', side: 'up', count: 10, spacing: 54 },
      { x: 195, y: 377, dir: 'h', side: 'down', count: 10, spacing: 54 },
      { x: 195, y: 541, dir: 'h', side: 'up', count: 10, spacing: 54 },
      { x: 195, y: 619, dir: 'h', side: 'down', count: 10, spacing: 54 },
    ],
  },

  CC2: {
    w: 790, h: 945,
    furniture: [
      { kind: 'projector', x: 40, y: 140, w: 270, h: 155, label: 'Projector' },
      { kind: 'cabin', x: 35, y: 580, w: 260, h: 225, label: "Lecturer's cabin" },
      { kind: 'door', x: 0, y: 830, w: 26, h: 85, label: 'Door', vertical: true },
    ],
    desks: [
      { x: 70, y: 360, dir: 'v', side: 'right', count: 5, spacing: 40 },
      { x: 500, y: 215, dir: 'h', side: 'down', count: 3, spacing: 40 },
      { x: 340, y: 370, dir: 'h', side: 'up', count: 10, spacing: 39 },
      { x: 330, y: 447, dir: 'h', side: 'down', count: 11, spacing: 36 },
      { x: 370, y: 540, dir: 'v', side: 'left', count: 5, spacing: 36 },
      { x: 435, y: 540, dir: 'v', side: 'right', count: 8, spacing: 36 },
      { x: 550, y: 540, dir: 'v', side: 'left', count: 8, spacing: 36 },
      { x: 625, y: 540, dir: 'v', side: 'right', count: 5, spacing: 36 },
    ],
  },
};

// Works out where every computer circle goes
const buildLayout = (layout) => {
  const bars = [];
  const slots = [];
  let n = 1;
  layout.desks.forEach((d) => {
    const S = d.spacing || 36;
    const len = d.count * S;
    bars.push(d.dir === 'h' ? { x: d.x, y: d.y - 3, w: len, h: 6 } : { x: d.x - 3, y: d.y, w: 6, h: len });
    for (let i = 0; i < d.count; i++) {
      const p = S * (i + 0.5);
      const cx = d.dir === 'h' ? d.x + p : d.x + (d.side === 'left' ? -OFF : OFF);
      const cy = d.dir === 'h' ? d.y + (d.side === 'up' ? -OFF : OFF) : d.y + p;
      slots.push({ no: n + (d.reverse ? d.count - 1 - i : i), cx, cy });
    }
    n += d.count;
  });
  return { bars, slots, total: n - 1 };
};

const BUILT = Object.fromEntries(Object.entries(LAYOUTS).map(([k, v]) => [k, buildLayout(v)]));
// </layouts>

// "CC1", "CC1 Lab" -> "CC1"
const layoutKeyFor = (name) => {
  const t = String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return Object.keys(LAYOUTS).find((k) => t.includes(k));
};

// "PC-01", "1", "01" -> 1
const numOf = (a) => {
  const m = String(a?.computerNo ?? '').match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : NaN;
};

/* "Chrome, VS Code; Linux" -> ['Chrome', 'VS Code', 'Linux'] */
const splitList = (v) =>
  String(v || '')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s && s.toLowerCase() !== 'none');

/* Classified specs. Reads the "CPU: .. | RAM: .. | Storage: .." summary saved in specificationDetails. */
const getSpecs = (asset) => {
  let { processor = '', ram = '', storage = '', installedSoftwares = '', requiredSoftwares = '' } = asset;
  if (!processor && !ram && !storage && asset.specificationDetails) {
    const t = asset.specificationDetails;
    const pick = (re) => (t.match(re)?.[1] || '').trim();
    processor = pick(/CPU:\s*([^|\n]+)/i);
    ram = pick(/RAM:\s*([^|\n]+)/i);
    storage = pick(/Storage:\s*([^|\n]+)/i);
    installedSoftwares = pick(/Installed:\s*([^\n]+)/i) || installedSoftwares;
    requiredSoftwares = pick(/Required:\s*([^\n]+)/i) || requiredSoftwares;

    // Plain text like "Core i5 11th Gen, 16GB RAM, 512GB SSD"
    if (!processor && !ram && !storage) {
      const parts = t.split('\n')[0].split(',').map((s) => s.trim());
      if (parts.length >= 3) [processor, ram, storage] = parts;
    }
  }
  return { processor, ram, storage, installedSoftwares, requiredSoftwares };
};

/* Converts the form data into what the backend expects */
const toApi = (p, labId) => {
  const t = (v) => String(v ?? '').trim();
  const installed = splitList(p.installedSoftwares).join(', ');
  const required = splitList(p.requiredSoftwares).join(', ');
  return {
    labId: Number(labId),
    computerNo: t(p.computerNo),
    assetTag: t(p.assetTag) || 'SUSL/FSSL/B/0014/0007/xxxx',
    installedSoftwares: installed,
    requiredSoftwares: required,
    specificationDetails:
      `CPU: ${t(p.processor)} | RAM: ${t(p.ram)} | Storage: ${t(p.storage)}\n` +
      `Installed: ${installed || 'None'}\nRequired: ${required || 'None'}`,
  };
};

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

const css = `
.ws { --maroon:#c02425; --maroon-d:#8f1a1b; --gold:#f5ab16; --ink:#1f2937; --muted:#6b7280; --line:#e5e7eb; --ok:#15803d; --bad:#c62828;
  color:var(--ink); padding:6px 0 30px; }
.ws * { box-sizing:border-box; }
.ws button { font:inherit; }
.ws button:focus-visible, .ws input:focus-visible, .ws textarea:focus-visible { outline:2px solid var(--gold); outline-offset:2px; }

.ws-head { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; flex-wrap:wrap; margin-bottom:22px; padding-bottom:14px; border-bottom:2px solid var(--gold); }
.ws-h1 { margin:0; font-size:26px; font-weight:700; color:var(--maroon); }
.ws-sub { margin:4px 0 0; font-size:14px; color:var(--muted); }

.ws-kpis { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-bottom:24px; }
.ws-kpi { background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px 18px; display:flex; align-items:center; gap:14px; }
.ws-kpi i { width:42px; height:42px; border-radius:12px; display:grid; place-items:center; font-style:normal; font-size:19px; }
.ws-kpi b { display:block; font-size:24px; line-height:1.1; }
.ws-kpi span { font-size:12px; font-weight:600; letter-spacing:.4px; text-transform:uppercase; color:var(--muted); }

/* lab cards */
.ws-labs { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:18px; }
.ws-lab { text-align:left; background:#fff; border:1px solid var(--line); border-radius:16px; padding:20px; cursor:pointer;
  box-shadow:0 2px 6px rgba(17,24,39,.05); transition:transform .15s, box-shadow .15s, border-color .15s; }
.ws-lab:hover { transform:translateY(-3px); box-shadow:0 12px 24px rgba(17,24,39,.1); border-color:var(--gold); }
.ws-lab-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.ws-lab h3 { margin:0; font-size:20px; color:var(--maroon); }
.ws-meta { display:flex; flex-direction:column; gap:4px; font-size:13px; color:#4b5563; margin-bottom:16px; }
.ws-meta b { color:var(--ink); font-weight:600; }
.ws-bar { height:7px; border-radius:99px; background:#fde8e8; overflow:hidden; }
.ws-bar i { display:block; height:100%; background:var(--ok); border-radius:99px; }
.ws-bar-t { display:flex; justify-content:space-between; margin-top:8px; font-size:12px; font-weight:600; }
.ws-open { margin-top:14px; font-size:13px; font-weight:600; color:var(--maroon); }

/* controls */
.ws-back { background:#fff; color:var(--maroon); border:1px solid var(--line); border-radius:10px; padding:9px 16px; font-weight:600; cursor:pointer; }
.ws-back:hover { border-color:var(--gold); background:#fffaf0; }
.ws-add { background:var(--maroon); color:#fff; border:0; border-radius:10px; padding:10px 18px; font-weight:600; cursor:pointer; }
.ws-add:hover { background:var(--maroon-d); }
.ws-bar-row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin:0 0 20px; }
.ws-search { flex:1; min-width:220px; height:42px; padding:0 14px; border:1px solid var(--line); border-radius:10px; background:#fff; font:inherit; font-size:14px; }
.ws-seg { display:inline-flex; background:#fff; border:1px solid var(--line); border-radius:10px; overflow:hidden; }
.ws-seg button { border:0; background:transparent; padding:10px 16px; font-size:13px; font-weight:600; color:var(--muted); cursor:pointer; }
.ws-seg button.on { background:var(--maroon); color:#fff; }
.ws-find { width:170px; height:42px; padding:0 14px; border:1px solid var(--line); border-radius:10px; background:#fff; font:inherit; font-size:14px; }

/* floor plan */
.ws-mapwrap { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(320px,1fr); gap:20px; align-items:start; }
.ws-map { background:#fff; border:1px solid var(--line); border-radius:14px; padding:14px; box-shadow:0 2px 6px rgba(17,24,39,.05); }
.ws-map svg { width:100%; height:auto; display:block; max-height:80vh; }
.ws-room { fill:#fcfcfd; stroke:#64748b; stroke-width:2.5; }
.ws-desk { fill:#cbd5e1; }
.ws-fur { fill:#f1f5f9; stroke:#94a3b8; stroke-width:1.5; }
.ws-fur.door { fill:#fde7b0; stroke:#d99a1b; }
.ws-fur.cabin { fill:#f8f1ff; stroke:#a78bca; }
.ws-fur-t { font-size:14px; font-weight:600; fill:#475569; }
.ws-slot { cursor:pointer; outline:none; }
.ws-slot .hit { fill:transparent; stroke:none; }
.ws-slot .scr { stroke-width:2; transition:stroke-width .12s; }
.ws-slot text { font-size:11px; font-weight:700; pointer-events:none; }
.ws-slot:hover .scr { stroke-width:3.5; }
.ws-slot.ok .scr { fill:#dcfce7; stroke:#16a34a; } .ws-slot.ok .stand { fill:#16a34a; } .ws-slot.ok text { fill:#14532d; }
.ws-slot.bad .scr { fill:#ef4444; stroke:#b91c1c; } .ws-slot.bad .stand { fill:#b91c1c; } .ws-slot.bad text { fill:#fff; }
.ws-slot.empty .scr { fill:#f8fafc; stroke:#cbd5e1; stroke-dasharray:3 3; } .ws-slot.empty .stand { fill:#cbd5e1; } .ws-slot.empty text { fill:#9ca3af; }
.ws-slot.has .scr { fill:#dbeafe; stroke:#2563eb; } .ws-slot.has .stand { fill:#2563eb; } .ws-slot.has text { fill:#1e3a8a; }
.ws-slot.lack .scr { fill:#ffedd5; stroke:#ea580c; } .ws-slot.lack .stand { fill:#ea580c; } .ws-slot.lack text { fill:#7c2d12; }
.ws-slot.sel .scr { stroke:#f5ab16; stroke-width:4; }
.ws-slot:focus-visible .scr { stroke:#2563eb; stroke-width:4; }
.ws-legend { display:flex; gap:18px; flex-wrap:wrap; margin-top:12px; font-size:12px; color:#4b5563; }
.ws-legend i { display:inline-block; width:18px; height:13px; border-radius:3px; margin-right:6px; vertical-align:-2px; border:2px solid; }
.ws-legend .l-ok { background:#dcfce7; border-color:#16a34a; }
.ws-legend .l-bad { background:#ef4444; border-color:#b91c1c; }
.ws-legend .l-empty { background:#f8fafc; border:2px dashed #cbd5e1; }
.ws-legend .l-has { background:#dbeafe; border-color:#2563eb; }
.ws-legend .l-lack { background:#ffedd5; border-color:#ea580c; }

/* software search */
.ws-swbox { position:relative; flex:1; min-width:240px; max-width:380px; }
.ws-swbox input { width:100%; height:42px; padding:0 38px 0 14px; border:1px solid var(--line); border-radius:10px; background:#fff; font:inherit; font-size:14px; }
.ws-swbox button { position:absolute; right:8px; top:50%; transform:translateY(-50%); width:26px; height:26px; border:0; border-radius:50%; background:#eef0f5; color:#4b5563; cursor:pointer; line-height:1; }
.ws-sw { background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px 18px; }
.ws-sw-sum { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
.ws-sw-sum span { padding:6px 12px; border-radius:999px; font-size:12px; font-weight:600; }
.ws-sw-sum .has { background:#dbeafe; color:#1e3a8a; }
.ws-sw-sum .lack { background:#ffedd5; color:#9a3412; }
.ws-sw-group { margin-top:12px; }
.ws-sw-group h6 { margin:0 0 8px; font-size:12px; font-weight:700; color:var(--ink); }
.ws-sw-chips { display:flex; flex-wrap:wrap; gap:6px; }
.ws-sw-chip { min-width:36px; padding:4px 10px; border-radius:8px; border:1px solid; font-size:12px; font-weight:700; cursor:pointer; }
.ws-sw-chip.has { background:#dbeafe; border-color:#93c5fd; color:#1e3a8a; }
.ws-sw-chip.lack { background:#ffedd5; border-color:#fdba74; color:#9a3412; }
.ws-sw-chip:hover { filter:brightness(.95); }
.ws-pill.sw-has { background:#dbeafe; color:#1e3a8a; }
.ws-pill.sw-lack { background:#ffedd5; color:#9a3412; }
.ws-chip.hl { background:#dbeafe; color:#1e3a8a; font-weight:700; }
.ws-side { position:sticky; top:150px; display:flex; flex-direction:column; gap:12px; }
.ws-hintbox { background:#fff; border:1px dashed #d1d5db; border-radius:14px; padding:22px; font-size:14px; color:var(--muted); line-height:1.6; text-align:center; }
.ws-hintbox b { color:var(--ink); display:block; font-size:16px; margin-bottom:6px; }
.ws-hintbox .ws-add { margin-top:12px; }

/* computers that have no circle on the map */
.ws-extra { margin-top:16px; padding-top:14px; border-top:1px solid var(--line); }
.ws-extra p { margin:0 0 10px; font-size:12px; color:var(--muted); }
.ws-extra-list { display:flex; flex-direction:column; gap:8px; }
.ws-xrow { display:flex; align-items:center; justify-content:space-between; gap:12px; width:100%; text-align:left; padding:10px 14px;
  background:#fff; border:1px solid var(--line); border-left:4px solid var(--ok); border-radius:10px; cursor:pointer; }
.ws-xrow:hover { border-color:var(--gold); border-left-color:var(--ok); }
.ws-xrow.bad { border-left-color:var(--bad); background:#fff8f8; }
.ws-xrow.sel { box-shadow:0 0 0 2px var(--gold); }
.ws-xrow b { display:block; font-size:14px; }
.ws-xrow small { display:block; margin-top:2px; font-size:11px; color:var(--muted); font-family:ui-monospace,Menlo,Consolas,monospace; word-break:break-all; }

/* PC cards */
.ws-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(310px,1fr)); gap:18px; }
.ws-pc { background:#fff; border:1px solid var(--line); border-top:4px solid var(--ok); border-radius:14px; padding:18px;
  display:flex; flex-direction:column; gap:14px; box-shadow:0 2px 6px rgba(17,24,39,.05); }
.ws-pc.bad { border-top-color:var(--bad); border-color:#f5c2c2; border-top-color:var(--bad); }
.ws-pc-h { display:flex; justify-content:space-between; align-items:center; gap:10px; }
.ws-pc-id { display:flex; align-items:center; gap:12px; min-width:0; }
.ws-mon { width:44px; height:44px; border-radius:12px; background:#fff5f5; color:var(--maroon); display:grid; place-items:center; flex:none; }
.ws-pc.ok .ws-mon { background:#ecfdf3; color:var(--ok); }
.ws-mon svg { width:24px; height:24px; }
.ws-pc-no { margin:0; font-size:17px; font-weight:700; }
.ws-tag { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:11px; color:var(--muted); word-break:break-all; }
.ws-pill { padding:4px 10px; border-radius:99px; font-size:11px; font-weight:700; white-space:nowrap; }
.ws-pill.ok { background:#e8f5e9; color:var(--ok); } .ws-pill.bad { background:#ffebee; color:var(--bad); }

.ws-fault { background:#fff5f5; border:1px solid #f5c2c2; border-radius:10px; padding:10px 12px; font-size:12px; color:#7f1d1d; }
.ws-fault-t { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:4px; color:#991b1b; }

.ws-sec-t { margin:0 0 8px; font-size:11px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:var(--muted); display:flex; justify-content:space-between; align-items:center; }
.ws-specs { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
.ws-spec { background:#f8fafc; border:1px solid #eef1f5; border-radius:10px; padding:9px 10px; min-width:0; }
.ws-spec span { display:block; font-size:10px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; color:var(--muted); }
.ws-spec b { display:block; margin-top:3px; font-size:12.5px; font-weight:600; word-break:break-word; }
.ws-chips { display:flex; flex-wrap:wrap; gap:6px; }
.ws-chip { padding:4px 10px; border-radius:99px; font-size:12px; font-weight:500; background:#eef2ff; color:#3730a3; }
.ws-chip.ok { background:#e8f5e9; color:#166534; }
.ws-chip.miss { background:#fff4d0; color:#92400e; border:1px dashed #e0a100; }
.ws-none { font-size:12px; color:#9ca3af; }
.ws-comp { font-size:11px; font-weight:600; text-transform:none; letter-spacing:0; }
.ws-comp.ok { color:var(--ok); } .ws-comp.bad { color:#b45309; }

.ws-acts { display:flex; justify-content:flex-end; gap:8px; margin-top:auto; padding-top:12px; border-top:1px solid var(--line); }
.ws-btn { padding:7px 14px; font-size:12px; font-weight:600; border-radius:8px; cursor:pointer; border:1px solid var(--line); background:#fff; }
.ws-btn.edit { color:#0369a1; } .ws-btn.edit:hover { background:#f0f9ff; border-color:#7dd3fc; }
.ws-btn.del { color:#b91c1c; } .ws-btn.del:hover { background:#fef2f2; border-color:#fca5a5; }
.ws-empty { grid-column:1/-1; text-align:center; padding:48px 20px; background:#fff; border:1px dashed #d1d5db; border-radius:14px; color:var(--muted); }

/* modal */
.ws-bg { position:fixed; inset:0; background:rgba(15,23,42,.5); display:flex; justify-content:center; align-items:center; z-index:1000; padding:16px; }
.ws-modal { background:#fff; border-radius:16px; width:560px; max-width:100%; max-height:92vh; overflow-y:auto; box-shadow:0 24px 60px rgba(0,0,0,.28); }
.ws-mh { padding:20px 24px; border-bottom:1px solid var(--line); }
.ws-mh h2 { margin:0; font-size:20px; color:var(--maroon); }
.ws-mh p { margin:4px 0 0; font-size:13px; color:var(--muted); }
.ws-mb { padding:20px 24px; display:flex; flex-direction:column; gap:18px; }
.ws-fs { border:1px solid var(--line); border-radius:12px; padding:14px 16px; margin:0; }
.ws-fs legend { padding:0 8px; font-size:12px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; color:var(--maroon); }
.ws-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.ws-row.three { grid-template-columns:repeat(3,minmax(0,1fr)); }
.ws-f label { display:block; margin-bottom:5px; font-size:12px; font-weight:600; }
.ws-f input, .ws-f textarea { width:100%; padding:9px 11px; border:1px solid #d1d5db; border-radius:8px; font:inherit; font-size:13px; }
.ws-f textarea { resize:vertical; }
.ws-f .err { border-color:#e5564f; background:#fff8f8; }
.ws-er { display:block; margin-top:4px; font-size:11px; font-weight:600; color:#c2352e; }
.ws-hint { display:block; margin-top:4px; font-size:11px; color:var(--muted); }
.ws-mf { display:flex; justify-content:flex-end; gap:10px; padding:16px 24px; border-top:1px solid var(--line); background:#fafafa; border-radius:0 0 16px 16px; }
.ws-cancel { padding:10px 18px; border-radius:10px; border:1px solid var(--line); background:#fff; font-weight:600; cursor:pointer; }
.ws-save { padding:10px 20px; border-radius:10px; border:0; background:var(--maroon); color:#fff; font-weight:600; cursor:pointer; }
.ws-save:hover { background:var(--maroon-d); }

@media (max-width:980px) { .ws-mapwrap { grid-template-columns:1fr; } .ws-side { position:static; } }
@media (max-width:700px) { .ws-kpis { grid-template-columns:1fr; } .ws-row, .ws-row.three, .ws-specs { grid-template-columns:1fr; } }
@media (prefers-reduced-motion:reduce) { .ws * { transition:none !important; } }
`;

const MonitorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" />
  </svg>
);

/* ---------- One computer: status, specs, installed + required software ---------- */
const PcCard = ({ asset, openFaults, canEdit, onEdit, onDelete, highlight = '' }) => {
  const working = openFaults.length === 0;
  const topFault = getTopFault(openFaults);
  const topPrio = topFault ? String(getFaultPriority(topFault)).toUpperCase() : '';
  const prio = PRIORITY_COLORS[topPrio] || PRIORITY_COLORS.MEDIUM;

  const sp = getSpecs(asset);
  const installed = splitList(sp.installedSoftwares);
  const required = splitList(sp.requiredSoftwares);
  const have = new Set(installed.map((s) => s.toLowerCase()));
  const missing = required.filter((r) => !have.has(r.toLowerCase()));

  return (
    <article className={`ws-pc ${working ? 'ok' : 'bad'}`}>
      <div className="ws-pc-h">
        <div className="ws-pc-id">
          <span className="ws-mon"><MonitorIcon /></span>
          <div style={{ minWidth: 0 }}>
            <h4 className="ws-pc-no">Computer {asset.computerNo}</h4>
            <div className="ws-tag">{asset.assetTag || 'SUSL/FSSL/B/0014/0007/0004'}</div>
          </div>
        </div>
        <span className={`ws-pill ${working ? 'ok' : 'bad'}`}>{working ? 'Working' : 'Not working'}</span>
      </div>

      {!working && (
        <div className="ws-fault">
          <div className="ws-fault-t">
            <strong>⚠ {openFaults.length} open {openFaults.length === 1 ? 'ticket' : 'tickets'}</strong>
            <span className="ws-pill" style={{ background: prio.bg, color: prio.fg, fontSize: 10 }}>{topPrio}</span>
          </div>
          <strong>TKT-{getFaultId(topFault)}</strong>{' · '}
          {topFault.issueDescription || topFault.description || 'No description'}
        </div>
      )}

      <div>
        <h5 className="ws-sec-t">Specification</h5>
        <div className="ws-specs">
          <div className="ws-spec"><span>CPU</span><b>{sp.processor || '—'}</b></div>
          <div className="ws-spec"><span>RAM</span><b>{sp.ram || '—'}</b></div>
          <div className="ws-spec"><span>Storage</span><b>{sp.storage || '—'}</b></div>
        </div>
      </div>

      <div>
        <h5 className="ws-sec-t">Installed software <span>{installed.length}</span></h5>
        {installed.length ? (
          <div className="ws-chips">
            {installed.map((s) => (
              <span key={s} className={`ws-chip ${highlight && s.toLowerCase().includes(highlight.toLowerCase()) ? 'hl' : ''}`}>{s}</span>
            ))}
          </div>
        ) : <span className="ws-none">Nothing recorded</span>}
      </div>

      <div>
        <h5 className="ws-sec-t">
          Required software
          {required.length > 0 && (
            <span className={`ws-comp ${missing.length ? 'bad' : 'ok'}`}>
              {missing.length ? `${missing.length} missing` : '✓ All installed'}
            </span>
          )}
        </h5>
        {required.length ? (
          <div className="ws-chips">
            {required.map((s) => {
              const isMissing = !have.has(s.toLowerCase());
              return <span key={s} className={`ws-chip ${isMissing ? 'miss' : 'ok'}`}>{isMissing ? '⚠ ' : '✓ '}{s}</span>;
            })}
          </div>
        ) : <span className="ws-none">Nothing required</span>}
      </div>

      {canEdit && (
        <div className="ws-acts">
          <button type="button" className="ws-btn edit" onClick={() => onEdit(asset)}>✏️ Edit</button>
          <button type="button" className="ws-btn del" onClick={() => onDelete(asset)}>🗑️ Delete</button>
        </div>
      )}
    </article>
  );
};

/* ---------- Furniture drawn on the floor plan ---------- */
const Furniture = ({ f }) => {
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  if (f.kind === 'arrow') {
    const mid = f.y + f.h * 0.45;
    return (
      <polygon
        points={`${cx},${f.y} ${f.x + f.w},${mid} ${cx + 9},${mid} ${cx + 9},${f.y + f.h} ${cx - 9},${f.y + f.h} ${cx - 9},${mid} ${f.x},${mid}`}
        fill="#1d4ed8" opacity="0.85"
      ><title>Front of the room</title></polygon>
    );
  }
  return (
    <g>
      <rect x={f.x} y={f.y} width={f.w} height={f.h} rx="6" className={`ws-fur ${f.kind}`} />
      {f.label && (
        <text x={cx} y={cy} dy=".35em" textAnchor="middle" className="ws-fur-t"
          transform={f.vertical ? `rotate(-90 ${cx} ${cy})` : undefined}>
          {f.label}
        </text>
      )}
    </g>
  );
};

/* ---------- The floor plan ---------- */
const LabMap = ({ layoutKey, assetsByNo, badCountOf, selectedNo, onSelect, swQ = '', hasSw }) => {
  const L = LAYOUTS[layoutKey];
  const B = BUILT[layoutKey];
  return (
    <svg viewBox={`0 0 ${L.w} ${L.h}`} role="group" aria-label={`${layoutKey} floor plan`}>
      <rect x="10" y="10" width={L.w - 20} height={L.h - 20} rx="12" className="ws-room" />
      {L.furniture.map((f, i) => <Furniture key={i} f={f} />)}
      {B.bars.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="3" className="ws-desk" />)}
      {B.slots.map((s) => {
        const asset = assetsByNo[s.no];
        const state = !asset
          ? 'empty'
          : swQ
          ? (hasSw(asset) ? 'has' : 'lack')
          : badCountOf(asset) > 0 ? 'bad' : 'ok';
        const label =
          state === 'has' ? `Has ${swQ}`
          : state === 'lack' ? `Does not have ${swQ}`
          : state === 'ok' ? 'Working'
          : state === 'bad' ? 'Not working'
          : 'Not added yet';
        return (
          <g
            key={s.no}
            className={`ws-slot ${state} ${selectedNo === s.no ? 'sel' : ''}`}
            role="button" tabIndex={0}
            aria-label={`Computer ${s.no}, ${label}`}
            onClick={() => onSelect(s.no)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(s.no))}
          >
            <title>{`Computer ${s.no} · ${label}`}</title>
            <g transform={`translate(${s.cx} ${s.cy})`}>
              <circle r={R} className="hit" />
              <rect className="scr" x="-14" y="-13" width="28" height="19" rx="3" />
              <rect className="stand" x="-2" y="6" width="4" height="4" />
              <rect className="stand" x="-8" y="10" width="16" height="3" rx="1.5" />
              <text x="0" y="-3.5" dy=".35em" textAnchor="middle">{s.no}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};

const Computers = ({
  labs = [],
  assets: initialAssets = [],
  faultReports = [],
  setAssets: parentSetAssets,
  userRole = 'student',
}) => {
  const [selectedLabId, setSelectedLabId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // asset id while editing, null while adding
  const [pcData, setPcData] = useState(EMPTY_PC);
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState('map'); // 'map' | 'list'
  const [selectedNo, setSelectedNo] = useState(null); // a circle on the map
  const [selectedExtra, setSelectedExtra] = useState(null); // a computer that has no circle (asset id)
  const [swQuery, setSwQuery] = useState(''); // software search on the map

  // Only admins can add / edit / delete. Everyone else is view-only.
  const canEdit = String(userRole || '').trim().toLowerCase() === 'admin';

  // Computers are loaded from, and saved to, the database (backend)
  const [localAssets, setLocalAssets] = useState(initialAssets);
  const [banner, setBanner] = useState(null); // { type: 'ok' | 'bad', text }
  const [legacy, setLegacy] = useState(() => {
    try { return JSON.parse(localStorage.getItem('labsync_assets') || '[]'); } catch (e) { return []; }
  });

  const parentSetAssetsRef = useRef(parentSetAssets);
  useEffect(() => {
    parentSetAssetsRef.current = parentSetAssets;
  }, [parentSetAssets]);

  const loadAssets = async () => {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      setLocalAssets(data);
      if (typeof parentSetAssetsRef.current === 'function') parentSetAssetsRef.current(data);
    } catch (e) {
      setBanner({ type: 'bad', text: 'Could not load computers from the server. Is the backend running?' });
    }
  };

  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Computers that were saved only in this browser (old version) -> upload them to the database
  const uploadLegacy = async () => {
    let added = 0;
    let skipped = 0;
    for (const a of legacy) {
      const labId = Number(a.labID ?? a.labId);
      const exists = localAssets.some(
        (x) =>
          String(getAssetLabId(x)) === String(labId) &&
          String(x.computerNo).trim().toLowerCase() === String(a.computerNo).trim().toLowerCase()
      );
      if (!labId || exists) { skipped++; continue; }
      const r = await callApi(API, { method: 'POST', body: JSON.stringify(toApi({ ...a, ...getSpecs(a) }, labId)) });
      if (r.ok) added++; else skipped++;
    }
    localStorage.removeItem('labsync_assets');
    setLegacy([]);
    await loadAssets();
    setBanner({ type: 'ok', text: `${added} computers uploaded to the database${skipped ? `, ${skipped} skipped` : ''}.` });
  };

  const discardLegacy = () => {
    localStorage.removeItem('labsync_assets');
    setLegacy([]);
  };

  useEffect(() => {
    if (!canEdit) setShowModal(false);
  }, [canEdit]);

  const selectedLab = labs?.find((lab) => String(getLabId(lab)) === String(selectedLabId));
  const labAssets = localAssets?.filter((a) => String(getAssetLabId(a)) === String(selectedLabId)) || [];

  /* ---------- Fault ticket link ---------- */
  // An asset is "Not working" while it has at least one open (not resolved) fault ticket.
  const faultCtx = { labs, assets: localAssets };
  const getAssetFaults = (asset) => getActiveFaultsForAsset(asset, faultReports, faultCtx);
  const notWorkingCount = (list = []) => list.filter((a) => getAssetFaults(a).length > 0).length;

  /* ---------- Floor plan data for the selected lab ---------- */
  const layoutKey = selectedLab ? layoutKeyFor(selectedLab.labName || selectedLab.name) : undefined;
  const built = layoutKey ? BUILT[layoutKey] : null;
  const showMap = !!built && view === 'map';

  const assetsByNo = {};
  labAssets.forEach((a) => {
    const n = numOf(a);
    if (!isNaN(n) && !assetsByNo[n]) assetsByNo[n] = a;
  });

  // Computers that have no circle on the map (number outside the plan, no number, or a duplicate number)
  const offMap = built
    ? labAssets.filter((a) => { const n = numOf(a); return isNaN(n) || n < 1 || n > built.total || assetsByNo[n] !== a; })
    : [];

  const selectedAsset = selectedExtra
    ? labAssets.find((a) => String(getAssetId(a)) === String(selectedExtra)) || null
    : selectedNo
    ? assetsByNo[selectedNo] || null
    : null;

  const selectCircle = (no) => {
    setSelectedExtra(null);
    setSelectedNo(no);
  };
  const selectExtra = (asset) => {
    setSelectedNo(null);
    setSelectedExtra(getAssetId(asset) ?? null);
  };

  /* ---------- Software search (map view) ---------- */
  // A computer "has" the software when the text is found in its INSTALLED software list.
  const swQ = swQuery.trim().toLowerCase();
  const hasSw = (a) => !!swQ && splitList(getSpecs(a).installedSoftwares).some((s) => s.toLowerCase().includes(swQ));
  const byNumber = (a, b) => (numOf(a) || 0) - (numOf(b) || 0);
  const swHas = swQ ? labAssets.filter(hasSw).sort(byNumber) : [];
  const swLack = swQ ? labAssets.filter((a) => !hasSw(a)).sort(byNumber) : [];

  // Select a computer from a result chip (a circle on the map, or the "other computers" list)
  const pickAsset = (a) => {
    const n = numOf(a);
    if (built && !isNaN(n) && n >= 1 && n <= built.total && assetsByNo[n] === a) selectCircle(n);
    else selectExtra(a);
  };

  /* ---------- Add / edit / delete ---------- */

  const handleOpenAddModal = (prefill) => {
    if (!canEdit) return;

    // Which computer number? the clicked circle, else the first free circle, else the next number after the highest one
    let no = typeof prefill === 'number' ? prefill : undefined;
    if (no === undefined) {
      if (built) {
        for (let n = 1; n <= built.total; n++) if (!assetsByNo[n]) { no = n; break; }
      }
      if (no === undefined) {
        const nums = labAssets.map(numOf).filter((n) => !isNaN(n));
        no = (nums.length ? Math.max(...nums) : 0) + 1;
      }
    }

    // Copy the specs and software of the latest computer in this lab to save typing
    const last = [...labAssets].sort((a, b) => (Number(getAssetId(b)) || 0) - (Number(getAssetId(a)) || 0))[0];
    const t = last ? getSpecs(last) : null;

    setEditingIndex(null);
    setPcData({
      ...EMPTY_PC,
      computerNo: no !== undefined ? String(no) : '',
      assetTag: no !== undefined
        ? `SUSL/FSSL/A/0014/${String(selectedLabId).padStart(4, '0')}/${String(no).padStart(4, '0')}`
        : '',
      ...(t ? {
        processor: t.processor, ram: t.ram, storage: t.storage,
        installedSoftwares: t.installedSoftwares, requiredSoftwares: t.requiredSoftwares,
      } : {}),
    });
    setErrors({});
    setShowModal(true);
  };

  const handleOpenEditModal = (asset) => {
    if (!canEdit) return;
    setEditingIndex(getAssetId(asset) ?? null);
    const s = getSpecs(asset);
    setPcData({
      computerNo: asset.computerNo || '',
      assetTag: asset.assetTag || '',
      processor: s.processor,
      ram: s.ram,
      storage: s.storage,
      installedSoftwares: s.installedSoftwares,
      requiredSoftwares: s.requiredSoftwares,
    });
    setErrors({});
    setShowModal(true);
  };

  const setField = (key, value) => {
    setPcData((p) => ({ ...p, [key]: value }));
    setErrors((e) => { const { [key]: _x, ...rest } = e; return rest; });
  };

  const validate = () => {
    const e = {};
    const no = String(pcData.computerNo).trim();
    if (!no) e.computerNo = 'Computer number is required.';
    else if (
      localAssets.some(
        (a) =>
          getAssetId(a) !== editingIndex &&
          String(getAssetLabId(a)) === String(selectedLabId) &&
          String(a.computerNo).trim().toLowerCase() === no.toLowerCase()
      )
    ) e.computerNo = 'This computer number already exists in this lab.';
    ['processor', 'ram', 'storage'].forEach((k) => {
      if (!String(pcData[k]).trim()) e[k] = 'Required.';
    });
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const isEdit = editingIndex !== null;
    const r = await callApi(isEdit ? `${API}/${editingIndex}` : API, {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(toApi(pcData, selectedLabId)),
    });
    if (!r.ok) { window.alert(r.text); return; }

    setShowModal(false);
    await loadAssets();
    setBanner({ type: 'ok', text: isEdit ? 'Computer updated.' : 'Computer added to the database.' });
  };

  const handleDelete = async (asset) => {
    if (!canEdit || !asset) return;
    if (!window.confirm(`Are you sure you want to delete Computer No ${asset.computerNo}?`)) return;

    const r = await callApi(`${API}/${getAssetId(asset)}`, { method: 'DELETE' });
    if (!r.ok) { setBanner({ type: 'bad', text: r.text }); return; }
    setSelectedExtra(null);
    await loadAssets();
    setBanner({ type: 'ok', text: `Computer ${asset.computerNo} was deleted.` });
  };

  /* ---------- Derived data ---------- */

  const totalPcs = localAssets?.length || 0;
  const totalBad = notWorkingCount(localAssets);

  const labTotal = labAssets.length;
  const labBad = notWorkingCount(labAssets);

  const q = query.trim().toLowerCase();
  const visibleAssets = labAssets.filter((a) => {
    const bad = getAssetFaults(a).length > 0;
    if (statusFilter === 'working' && bad) return false;
    if (statusFilter === 'bad' && !bad) return false;
    if (!q) return true;
    const s = getSpecs(a);
    return [a.computerNo, a.assetTag, s.processor, s.ram, s.storage, s.installedSoftwares, s.requiredSoftwares]
      .some((v) => String(v || '').toLowerCase().includes(q));
  });

  /* ---------- Render ---------- */

  return (
    <div className="ws">
      <style>{css}</style>

      {banner && (
        <div role="status" style={{
          padding: '11px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
          background: banner.type === 'ok' ? '#e8f7ee' : '#fdecec',
          color: banner.type === 'ok' ? '#166534' : '#991b1b',
          border: `1px solid ${banner.type === 'ok' ? '#bde5cb' : '#f5c2c2'}`,
        }}>{banner.text}</div>
      )}

      {canEdit && legacy.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13,
          background: '#fff4d0', color: '#8a5a00', border: '1px solid #ecd48a',
        }}>
          <span>{legacy.length} computers are saved only in this browser, not in the database.</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="ws-add" onClick={uploadLegacy}>Upload to database</button>
            <button type="button" className="ws-back" onClick={discardLegacy}>Discard</button>
          </span>
        </div>
      )}

      {!selectedLabId ? (
        <>
          <div className="ws-head">
            <div>
              <h2 className="ws-h1">Computers</h2>
              <p className="ws-sub">Choose a computer lab to see its computers, specifications and software that installed and required software.</p>
            </div>
          </div>

          <div className="ws-kpis">
            <div className="ws-kpi"><i style={{ background: '#eff6ff' }}>🖥️</i><div><b>{totalPcs}</b><span>Total computers</span></div></div>
            <div className="ws-kpi"><i style={{ background: '#ecfdf3' }}>✅</i><div><b style={{ color: '#15803d' }}>{totalPcs - totalBad}</b><span>Working</span></div></div>
            <div className="ws-kpi"><i style={{ background: '#fef2f2' }}>⚠️</i><div><b style={{ color: totalBad ? '#c62828' : undefined }}>{totalBad}</b><span>Not working</span></div></div>
          </div>

          <div className="ws-labs">
            {labs?.map((lab, index) => {
              const id = getLabId(lab);
              const pcs = localAssets?.filter((a) => String(getAssetLabId(a)) === String(id)) || [];
              const bad = notWorkingCount(pcs);
              const pct = pcs.length ? Math.round(((pcs.length - bad) / pcs.length) * 100) : 0;
              return (
                <button
                  key={id || index}
                  type="button"
                  className="ws-lab"
                  onClick={() => {
                    setSelectedLabId(id); setQuery(''); setStatusFilter('all');
                    setSelectedNo(null); setSelectedExtra(null); setSwQuery(''); setView('map');
                  }}
                >
                  <div className="ws-lab-top">
                    <h3>{lab.labName || lab.name}</h3>
                    {bad > 0 && <span className="ws-pill bad">⚠ {bad} not working</span>}
                  </div>
                  <div className="ws-meta">
                    <span><b>Location:</b> {lab.location}</span>
                    <span><b>Capacity:</b> {lab.capacity} seats</span>
                  </div>
                  <div className="ws-bar"><i style={{ width: `${pct}%` }} /></div>
                  <div className="ws-bar-t">
                    <span style={{ color: '#15803d' }}>{pcs.length - bad} of {pcs.length} PCs working</span>
                    <span style={{ color: '#6b7280' }}>{pct}%</span>
                  </div>
                  <div className="ws-open">View computers →</div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="ws-head">
            <div>
              <button type="button" className="ws-back" onClick={() => setSelectedLabId(null)}>← All labs</button>
              <h2 className="ws-h1" style={{ marginTop: 14 }}>{selectedLab?.labName || selectedLab?.name} · Computers</h2>
              <p className="ws-sub">
                {selectedLab?.location}{selectedLab?.capacity ? ` · ${selectedLab.capacity} seats` : ''} · {labTotal} computers
                {' · '}<span style={{ color: '#15803d', fontWeight: 600 }}>{labTotal - labBad} working</span>
                {' · '}<span style={{ color: labBad ? '#c62828' : '#6b7280', fontWeight: 600 }}>{labBad} not working</span>
              </p>
            </div>
            {canEdit && <button type="button" className="ws-add" onClick={() => handleOpenAddModal()}>+ Add computer</button>}
          </div>

          {/* View switch (only labs that have a floor plan) */}
          <div className="ws-bar-row">
            {built && (
              <div className="ws-seg" role="group" aria-label="Choose view">
                <button type="button" className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>🗺️ Lab map</button>
                <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>☰ List</button>
              </div>
            )}

            {showMap ? (
              <input
                className="ws-find" type="number" min="1" max={built.total}
                placeholder={`Find computer (1-${built.total})`} aria-label="Find a computer by number"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  selectCircle(n >= 1 && n <= built.total ? n : null);
                }}
              />
            ) : (
              <>
                <input className="ws-search" placeholder="Search by number, tag, CPU, RAM or software" value={query}
                  onChange={(e) => setQuery(e.target.value)} aria-label="Search computers" />
                <div className="ws-seg" role="group" aria-label="Filter by status">
                  {[['all', 'All'], ['working', 'Working'], ['bad', 'Not working']].map(([k, label]) => (
                    <button key={k} type="button" className={statusFilter === k ? 'on' : ''} onClick={() => setStatusFilter(k)}>{label}</button>
                  ))}
                </div>
              </>
            )}

            {showMap && (
              <div className="ws-swbox">
                <input
                  type="search"
                  value={swQuery}
                  onChange={(e) => setSwQuery(e.target.value)}
                  placeholder="Search software (e.g. Photoshop)"
                  aria-label="Search installed software"
                />
                {swQuery && (
                  <button type="button" onClick={() => setSwQuery('')} aria-label="Clear software search">✕</button>
                )}
              </div>
            )}
          </div>

          {showMap ? (
            <div className="ws-mapwrap">
              <div className="ws-map">
                <LabMap
                  layoutKey={layoutKey}
                  assetsByNo={assetsByNo}
                  badCountOf={(a) => getAssetFaults(a).length}
                  selectedNo={selectedNo}
                  onSelect={selectCircle}
                  swQ={swQuery.trim()}
                  hasSw={hasSw}
                />
                <div className="ws-legend">
                  {swQ ? (
                    <>
                      <span><i className="l-has" />Has the software</span>
                      <span><i className="l-lack" />Does not have it</span>
                    </>
                  ) : (
                    <>
                      <span><i className="l-ok" />Working</span>
                      <span><i className="l-bad" />Not working</span>
                    </>
                  )}
                  <span><i className="l-empty" />Not added yet</span>
                </div>

                {offMap.length > 0 && (
                  <div className="ws-extra">
                    <h5 className="ws-sec-t">Other computers (not on the map) <span>{offMap.length}</span></h5>
                    <p>These computers have a number that is not on the plan. Click one to see its details.</p>
                    <div className="ws-extra-list">
                      {offMap.map((a, i) => {
                        const bad = !swQ && getAssetFaults(a).length > 0;
                        const isSel = selectedExtra !== null && String(selectedExtra) === String(getAssetId(a));
                        return (
                          <button
                            key={getAssetId(a) ?? `${a.computerNo}-${i}`}
                            type="button"
                            className={`ws-xrow ${bad ? 'bad' : 'ok'} ${isSel ? 'sel' : ''}`}
                            onClick={() => selectExtra(a)}
                          >
                            <span>
                              <b>Computer {a.computerNo || `#${getAssetId(a)}`}</b>
                              <small>{a.assetTag || 'No asset tag'}</small>
                            </span>
                            {swQ ? (
                              <span className={`ws-pill ${hasSw(a) ? 'sw-has' : 'sw-lack'}`}>{hasSw(a) ? 'Has it' : "Doesn't have it"}</span>
                            ) : (
                              <span className={`ws-pill ${bad ? 'bad' : 'ok'}`}>{bad ? 'Not working' : 'Working'}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="ws-side">
                {swQ && (
                  <div className="ws-sw">
                    <h5 className="ws-sec-t">Software: {swQuery.trim()}</h5>
                    <div className="ws-sw-sum">
                      <span className="has"><b>{swHas.length}</b> have it</span>
                      <span className="lack"><b>{swLack.length}</b> don't have it</span>
                    </div>

                    <div className="ws-sw-group">
                      <h6>Have it installed ({swHas.length})</h6>
                      {swHas.length ? (
                        <div className="ws-sw-chips">
                          {swHas.map((a, i) => (
                            <button type="button" key={getAssetId(a) ?? `h${i}`} className="ws-sw-chip has" onClick={() => pickAsset(a)}>
                              {a.computerNo}
                            </button>
                          ))}
                        </div>
                      ) : <span className="ws-none">No computer has it</span>}
                    </div>

                    <div className="ws-sw-group">
                      <h6>Do not have it ({swLack.length})</h6>
                      {swLack.length ? (
                        <div className="ws-sw-chips">
                          {swLack.map((a, i) => (
                            <button type="button" key={getAssetId(a) ?? `l${i}`} className="ws-sw-chip lack" onClick={() => pickAsset(a)}>
                              {a.computerNo}
                            </button>
                          ))}
                        </div>
                      ) : <span className="ws-none">Every computer has it</span>}
                    </div>
                  </div>
                )}

                {!swQ && !selectedAsset && !selectedNo && (
                  <div className="ws-hintbox">
                    <b>Find a computer</b>
                    Click any computer on the map to see its status, installed software and required software.
                    Red computers are not working.
                  </div>
                )}

                {selectedAsset && (
                  <PcCard
                    asset={selectedAsset}
                    openFaults={getAssetFaults(selectedAsset)}
                    highlight={swQuery.trim()}
                    canEdit={canEdit}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDelete}
                  />
                )}

                {selectedNo && !selectedAsset && (
                  <div className="ws-hintbox">
                    <b>Computer {selectedNo}</b>
                    This computer has not been added to the system yet.
                    {canEdit && (
                      <div><button type="button" className="ws-add" onClick={() => handleOpenAddModal(selectedNo)}>+ Add computer {selectedNo}</button></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="ws-grid">
              {visibleAssets.length === 0 && (
                <div className="ws-empty">{labTotal === 0 ? 'No computers found for this lab.' : 'No computers match your search.'}</div>
              )}

              {visibleAssets.map((asset, idx) => (
                <PcCard
                  key={getAssetId(asset) ?? `${asset.computerNo}-${idx}`}
                  asset={asset}
                  openFaults={getAssetFaults(asset)}
                  highlight={swQuery.trim()}
                  canEdit={canEdit}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ---------- Add / edit modal (admin only) ---------- */}
      {canEdit && showModal && (
        <div className="ws-bg" role="dialog" aria-modal="true">
          <form className="ws-modal" onSubmit={handleSubmit} noValidate>
            <div className="ws-mh">
              <h2>{editingIndex !== null ? 'Edit computer' : 'Add new computer'}</h2>
              <p>{selectedLab?.labName || selectedLab?.name}</p>
            </div>

            <div className="ws-mb">
              <fieldset className="ws-fs">
                <legend>Identification</legend>
                <div className="ws-row">
                  <div className="ws-f">
                    <label htmlFor="ws-no">Computer no</label>
                    <input id="ws-no" className={errors.computerNo ? 'err' : ''} placeholder="e.g. 1 or PC-01"
                      value={pcData.computerNo} onChange={(e) => setField('computerNo', e.target.value)} />
                    {errors.computerNo && <span className="ws-er">{errors.computerNo}</span>}
                    {built && <span className="ws-hint">Numbers 1 to {built.total} have a circle on the map. Any other number is listed under "Other computers".</span>}
                  </div>
                  <div className="ws-f">
                    <label htmlFor="ws-tag">Asset tag / inventory code</label>
                    <input id="ws-tag" placeholder="SUSL/FSSL/B/0014/0007/0004"
                      value={pcData.assetTag} onChange={(e) => setField('assetTag', e.target.value)} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="ws-fs">
                <legend>Hardware specification</legend>
                <div className="ws-row three">
                  {[['processor', 'Processor (CPU)', 'Core i5 11th Gen'], ['ram', 'RAM', '16GB'], ['storage', 'Storage', '512GB SSD']].map(([k, label, ph]) => (
                    <div className="ws-f" key={k}>
                      <label htmlFor={`ws-${k}`}>{label}</label>
                      <input id={`ws-${k}`} className={errors[k] ? 'err' : ''} placeholder={ph}
                        value={pcData[k]} onChange={(e) => setField(k, e.target.value)} />
                      {errors[k] && <span className="ws-er">{errors[k]}</span>}
                    </div>
                  ))}
                </div>
              </fieldset>

              <fieldset className="ws-fs">
                <legend>Software</legend>
                <div className="ws-f" style={{ marginBottom: 12 }}>
                  <label htmlFor="ws-inst">Installed software</label>
                  <textarea id="ws-inst" rows="2" placeholder="Adobe Photoshop, Adobe Animate"
                    value={pcData.installedSoftwares} onChange={(e) => setField('installedSoftwares', e.target.value)} />
                </div>
                <div className="ws-f">
                  <label htmlFor="ws-req">Required software</label>
                  <textarea id="ws-req" rows="2" placeholder="Linux, VS Code, Laravel"
                    value={pcData.requiredSoftwares} onChange={(e) => setField('requiredSoftwares', e.target.value)} />
                  <span className="ws-hint">Separate names with commas. Required items that are not installed are flagged on the card.</span>
                </div>
              </fieldset>
            </div>

            <div className="ws-mf">
              <button type="button" className="ws-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="ws-save">{editingIndex !== null ? 'Update computer' : 'Save computer'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Computers;