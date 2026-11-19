// Shared password rules. Imported by UserManagement.jsx and LoginForm.jsx.
// Required exports: PASSWORD_RULES, passedRules, isStrongPassword, strengthLevel, generateTempPassword

export const PASSWORD_RULES = [
  { id: 'len',   label: 'At least 8 characters',            test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A-Z)',        test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a-z)',        test: (p) => /[a-z]/.test(p) },
  { id: 'num',   label: 'One number (0-9)',                  test: (p) => /[0-9]/.test(p) },
  { id: 'sym',   label: 'One special character (! @ # $ %)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const passedRules = (p = '') => PASSWORD_RULES.filter((r) => r.test(p)).length;

export const isStrongPassword = (p = '') => passedRules(p) === PASSWORD_RULES.length;

// 0 = empty, 1 = weak, 2 = medium, 3 = strong
export const strengthLevel = (p = '') => {
  if (!p) return 0;
  const n = passedRules(p);
  return n <= 2 ? 1 : n < PASSWORD_RULES.length ? 2 : 3;
};

// Random temporary password that always satisfies every rule
export const generateTempPassword = (length = 10) => {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%&*?'];
  const all = sets.join('');
  const rnd = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const chars = sets.map((s) => s[rnd(s.length)]);
  while (chars.length < length) chars.push(all[rnd(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};