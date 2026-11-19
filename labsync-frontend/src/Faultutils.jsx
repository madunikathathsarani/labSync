// Shared helpers that link Fault Tickets <-> computers (assets).
// Both screens import from here, so "is this PC faulty?" is decided in one place.

/* ---------- Small utilities ---------- */

export const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');
export const norm = (v) => String(v ?? '').trim().toLowerCase();

/* ---------- Field readers (handle different backend shapes) ---------- */

export const getLabId = (lab) => pick(lab?.labID, lab?.labId, lab?.id);
export const getLabName = (lab) => pick(lab?.labName, lab?.name, lab?.labCode);

export const getAssetId = (a) => pick(a?.assetID, a?.assetId, a?.asset_id, a?.id);
export const getAssetLabId = (a) =>
  pick(a?.labID, a?.labId, a?.lab_id, a?.lab?.labID, a?.lab?.labId, a?.lab?.id);

export const getFaultId = (f, fallback) => pick(f?.reportID, f?.reportId, f?.id, fallback);
export const getFaultAssetId = (f) =>
  pick(f?.assetID, f?.assetId, f?.asset_id, f?.asset?.assetID, f?.asset?.assetId, f?.asset?.id);

export const getFaultLabId = (f) =>
  pick(
    f?.labID,
    f?.labId,
    f?.lab_id,
    f?.lab?.labID,
    f?.lab?.labId,
    f?.lab?.id,
    /^\d+$/.test(String(f?.lab ?? '')) ? f.lab : undefined
  );

export const getFaultLabName = (f, labs = []) => {
  const direct = pick(f?.lab?.labName, f?.lab?.name, f?.labName, typeof f?.lab === 'string' ? f.lab : undefined);
  if (direct) return direct;
  const id = getFaultLabId(f);
  const match = labs.find((l) => String(getLabId(l)) === String(id));
  return match ? getLabName(match) : undefined;
};

export const getFaultPriority = (f) =>
  pick(f?.priority, f?.priorityLevel, f?.priority_level, f?.prio) || 'Medium';

export const priorityRank = (p) =>
  ({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[String(p || '').toUpperCase()] || 0);

/* ---------- Equipment (lab-level) faults ---------- */

export const getFaultEquipmentType = (f) => pick(f?.equipmentType, f?.equipment_type, f?.equipment);

// A fault is "equipment" when it is about the lab itself (AC, projector, network...)
// and not about one particular computer.
export const isEquipmentFault = (f) => {
  if (norm(f?.faultType ?? f?.fault_type) === 'equipment') return true;
  if (norm(f?.faultType ?? f?.fault_type) === 'computer') return false;
  // Older / unlabeled records: equipment type present, but no computer info at all
  return !!getFaultEquipmentType(f) && getFaultAssetId(f) === undefined && !pick(f?.computerNo, f?.pcNo);
};

/* ---------- Computer number matching ---------- */

// "PC-01", "pc 1", "1" and "01" are all treated as the same computer number.
const pcKey = (v) => {
  const s = String(v ?? '').trim();
  const m = s.match(/(\d+)\s*$/);
  return m ? String(parseInt(m[1], 10)) : norm(s);
};

export const sameComputerNo = (a, b) => {
  if (!norm(a) || !norm(b)) return false;
  return norm(a) === norm(b) || pcKey(a) === pcKey(b);
};

// Finds the computer number of a fault, even if the backend only sent an asset id.
export const resolveFaultComputerNo = (fault, assets = []) => {
  const direct = pick(
    fault?.computerNo,
    fault?.workstationNo,
    fault?.workStationNo,
    fault?.pcNo,
    fault?.asset?.computerNo,
    fault?.assetNo
  );
  if (direct !== undefined) return String(direct);

  const id = getFaultAssetId(fault);
  if (id !== undefined) {
    const match = assets.find((a) => String(getAssetId(a)) === String(id));
    if (match?.computerNo) return String(match.computerNo);
  }
  return undefined;
};

// What to show in the "Item" column: the equipment name, or "PC <number>".
export const getFaultItemLabel = (fault, assets = []) => {
  if (isEquipmentFault(fault)) return getFaultEquipmentType(fault) || 'Lab equipment';
  const pc = resolveFaultComputerNo(fault, assets);
  return pc ? `PC ${pc}` : 'PC —';
};

/* ---------- Status ---------- */

export const isActiveFault = (fault) =>
  !['resolved', 'fixed', 'done', 'closed', 'completed'].includes(norm(fault?.status));

/* ---------- The link: does this fault belong to this asset? ---------- */

export const faultMatchesAsset = (fault, asset, ctx = {}) => {
  const { labs = [], assets = [] } = ctx;

  // 0) Lab-equipment faults (AC, projector...) never belong to a single PC
  if (isEquipmentFault(fault)) return false;

  // 1) Best match: same asset id on both sides
  const fAssetId = getFaultAssetId(fault);
  const aId = getAssetId(asset);
  if (fAssetId !== undefined && aId !== undefined) return String(fAssetId) === String(aId);

  // 2) Fallback: same computer number...
  const fPc = resolveFaultComputerNo(fault, assets);
  if (!sameComputerNo(fPc, asset?.computerNo)) return false;

  // 3) ...in the same lab
  const fLabId = getFaultLabId(fault);
  const aLabId = getAssetLabId(asset);
  if (fLabId !== undefined && aLabId !== undefined) return String(fLabId) === String(aLabId);

  const aLab = labs.find((l) => String(getLabId(l)) === String(aLabId));
  const aName = aLab ? getLabName(aLab) : undefined;
  const fName = getFaultLabName(fault, labs);
  if (aName && fName) return norm(aName) === norm(fName);

  return true; // lab can't be compared, computer number matched
};

// All OPEN (not resolved) tickets for one computer
export const getActiveFaultsForAsset = (asset, faults = [], ctx = {}) =>
  (Array.isArray(faults) ? faults : []).filter((f) => isActiveFault(f) && faultMatchesAsset(f, asset, ctx));

// All OPEN equipment tickets of one lab (handy for a badge on the Labs page)
export const getActiveEquipmentFaultsForLab = (lab, faults = [], labs = []) =>
  (Array.isArray(faults) ? faults : []).filter((f) => {
    if (!isActiveFault(f) || !isEquipmentFault(f)) return false;
    const fLabId = getFaultLabId(f);
    const labId = getLabId(lab);
    if (fLabId !== undefined && labId !== undefined) return String(fLabId) === String(labId);
    const fName = getFaultLabName(f, labs);
    const lName = getLabName(lab);
    return !!fName && !!lName && norm(fName) === norm(lName);
  });

// The most urgent open ticket of a list (for showing a short summary)
export const getTopFault = (list = []) =>
  [...list].sort((a, b) => priorityRank(getFaultPriority(b)) - priorityRank(getFaultPriority(a)))[0];