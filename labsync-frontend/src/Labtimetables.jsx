// Weekly lab timetables, transcribed from the printed "Hall Time Table".
// To update next semester, only edit this file.
//
// Each entry: [start, end, code]
//   code present  -> timetabled LECTURE (reserved, cannot be booked)
//   code missing  -> "Allocate Students to Use" (open for students, CAN be booked)
//   no entry      -> free / available

export const TIMETABLE_META = {
  title: 'Semester I - 2026',
  validFrom: '30.06.2026',
  validTo: '02.10.2026'
};

export const TIMETABLES = {
  CC1: {
    Mon: [
      ['08:00', '11:00'],
      ['11:00', '12:30', 'CIT111-F-P HU/JY'],
      ['13:30', '15:00'],
      ['15:00', '16:30', 'ICT211-GY-C1,CC2,CC1'],
      ['16:30', '19:30', 'ICT311-GY-C1,CC2,A5']
    ],
    Tue: [
      ['08:00', '09:30', 'CIT111-D-P-GY/PR'],
      ['09:30', '12:30'],
      ['13:30', '15:00'],
      ['15:00', '16:30', 'ICT211-VPG-C1,CC2,CC1'],
      ['16:30', '19:30']
    ],
    Wed: [
      ['08:00', '10:30', 'ICT111 (P)-NR'],
      ['10:30', '11:30', 'CIT211-D-P-NR,JY.PR'],
      ['13:30', '16:30', 'ICT313-NR'],
      ['16:30', '19:30']
    ],
    Thu: [
      ['08:00', '09:00', 'CIT211-A-PR,JY.PR'],
      ['09:00', '11:00'],
      ['11:00', '12:30', 'CIT111-E-A-GY/PR'],
      ['13:30', '16:30', 'ICT412-VPG'],
      ['16:30', '19:30']
    ],
    Fri: [
      ['08:00', '12:30'],
      ['13:30', '16:30'],
      ['16:30', '19:30', 'TRL315-VL']
    ]
  },

  CC2: {
    Mon: [
      ['08:00', '09:30'],
      ['11:00', '12:30', 'CIT111-G-P GY/DD'],
      ['13:30', '15:00'],
      ['15:00', '16:30', 'ICT211-GY-C1,CC2,CC1'],
      ['16:30', '19:30', 'ICT311-GY-C1,CC2,A5']
    ],
    Tue: [
      ['08:00', '09:30', 'CIT111-E-P-DL/DD'],
      ['09:30', '12:30', 'ICT212-VPG'],
      ['13:30', '15:00', 'ICT312-VL'],
      ['15:00', '16:30', 'ICT211-GY-C1,CC2,CC1'],
      ['16:30', '19:30', 'ICT213-VPG']
    ],
    Wed: [
      ['08:00', '10:30', 'ICT111 (P)-NR'],
      ['10:30', '11:30', 'CIT211-P-E-GY,HU'],
      ['13:30', '16:30'],
      ['16:30', '19:30', 'ICT315-VPG']
    ],
    Thu: [
      ['08:00', '09:00', 'CIT211-P-B-GY,HU'],
      ['09:00', '11:00'],
      ['11:00', '12:30', 'CIT111-E-B-DL/DD'],
      ['13:30', '19:30']
    ],
    Fri: [
      ['08:00', '12:30'],
      ['13:30', '19:30']
    ]
  },

  A5: {
    Mon: [
      ['08:00', '11:00', 'STC313-E-GMG'],
      ['11:00', '12:30', 'CIT111-H-P DL/PR'],
      ['15:00', '16:30', 'ICT211-GY-C1,CC2,CC1'],
      ['16:30', '19:30', 'ICT311-GY-C1,CC2,A5']
    ],
    Tue: [
      ['08:00', '09:30'],
      ['09:30', '12:30', 'STC313-S-GMG'],
      ['15:00', '16:30', 'ICT211-GY-C1,CC2,CC1'],
      ['16:30', '19:30']
    ],
    Wed: [
      ['08:00', '10:30', 'ICT111 (P)-NR'],
      ['10:30', '11:30', 'CIT211-P-F-DL,DD'],
      ['13:30', '16:30', 'ICT415-VL'],
      ['16:30', '19:30', 'ICT414-RU']
    ],
    Thu: [
      ['08:00', '09:00', 'CIT211-P-C-DL,DD'],
      ['09:00', '11:00'],
      ['11:00', '12:30', 'CIT111-E-C-HU/JY'],
      ['13:30', '16:30', 'ICT314-RU'],
      ['16:30', '19:30']
    ],
    Fri: [
      ['08:00', '09:30'],
      ['09:30', '12:30', 'ICT413-VL'],
      ['15:00', '19:30']
    ]
  }
};

/* ---------- Helpers ---------- */

export const SLOTS = [
  { value: '08:00-09:30', label: '08:00 AM - 09:30 AM' },
  { value: '09:30-11:00', label: '09:30 AM - 11:00 AM' },
  { value: '11:00-12:30', label: '11:00 AM - 12:30 PM' },
  { value: '13:30-15:00', label: '01:30 PM - 03:00 PM' },
  { value: '15:00-16:30', label: '03:00 PM - 04:30 PM' },
  { value: '16:30-18:00', label: '04:30 PM - 06:00 PM' },
  { value: '18:00-19:30', label: '06:00 PM - 07:30 PM' }
];

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // index = Date.getDay()

// "08:00" or "08:00:00" -> minutes since midnight
export const toMin = (t) => {
  const [h, m] = String(t || '').split(':');
  return parseInt(h, 10) * 60 + parseInt(m || '0', 10);
};

// "CC1", "cc1", "CC1 Computer Lab" all match the CC1 timetable
const normLab = (n) =>
  String(n || '')
    .toLowerCase()
    .replace(/computer\s*lab|lab/g, '')
    .replace(/[^a-z0-9]/g, '');

export const findTimetableKey = (labName) => Object.keys(TIMETABLES).find((k) => normLab(k) === normLab(labName));
export const hasTimetable = (labName) => !!findTimetableKey(labName);

// Timetable blocks that overlap one booking slot (e.g. "09:30-11:00") on a weekday ("Mon".."Fri")
export const getSlotBlocks = (labName, dayName, slotValue) => {
  const key = findTimetableKey(labName);
  if (!key) return [];
  const [slotStart, slotEnd] = slotValue.split('-').map(toMin);
  return (TIMETABLES[key][dayName] || [])
    .map(([start, end, code]) => ({ start, end, code, s: toMin(start), e: toMin(end) }))
    .filter((b) => b.s < slotEnd && b.e > slotStart);
};