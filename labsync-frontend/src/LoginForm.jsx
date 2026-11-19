import React, { useState, useRef, useEffect } from 'react';
import './LoginForm.css';
import logo from './logo.png'; // Campus Logo
import { logActivity, setActor } from './activityApi';
/* ---------------- Strong password rules (used when the user creates / resets their own password) ---------------- */

const PASSWORD_RULES = [
  { id: 'len',   label: 'At least 8 characters',            test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A-Z)',        test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a-z)',        test: (p) => /[a-z]/.test(p) },
  { id: 'num',   label: 'One number (0-9)',                  test: (p) => /[0-9]/.test(p) },
  { id: 'sym',   label: 'One special character (! @ # $ %)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const passedRules = (p = '') => PASSWORD_RULES.filter((r) => r.test(p)).length;
const isStrongPassword = (p = '') => passedRules(p) === PASSWORD_RULES.length;
// 0 = empty, 1 = weak, 2 = medium, 3 = strong
const strengthLevel = (p = '') => {
  if (!p) return 0;
  const n = passedRules(p);
  return n <= 2 ? 1 : n < PASSWORD_RULES.length ? 2 : 3;
};

const API = 'http://localhost:8080/api/auth';
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

const post = (path, body) =>
  fetch(`${API}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

const readUsers = () => JSON.parse(localStorage.getItem('labsync_users') || '[]');


const savePasswordLocally = (match, newPassword) => {
  const updated = readUsers().map((u) =>
    match(u) ? { ...u, password: newPassword, mustChangePassword: false } : u
  );
  localStorage.setItem('labsync_users', JSON.stringify(updated));
};

/* Strength meter + requirement checklist */
const PasswordChecklist = ({ password }) => {
  const passed = passedRules(password);
  const level = strengthLevel(password);
  return (
    <div className="pw-box" aria-live="polite">
      <div className="pw-meter">
        <i className={`lvl-${level}`} style={{ width: `${(passed / PASSWORD_RULES.length) * 100}%` }} />
      </div>
      <div className="pw-label">
        Password strength: <b>{['Not set', 'Weak', 'Medium', 'Strong'][level]}</b>
      </div>
      <ul className="pw-rules">
        {PASSWORD_RULES.map((r) => (
          <li key={r.id} className={r.test(password) ? 'ok' : ''}>
            {r.test(password) ? '✓' : '○'} {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

const LoginForm = ({ onLogin }) => {
  // view: 'login' | 'change' | 'forgot' | 'otp' | 'reset'
  const [view, setView] = useState('login');
  const [formData, setFormData] = useState({ role: 'Student', userId: '', password: '' });

  // First-login state: the user who signed in with the admin-given password
  const [pending, setPending] = useState(null); // { user, source: 'api' | 'local' }

  // Forgot-password state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef([]);

  const isStudent = formData.role === 'Student';

  // Resend countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const goTo = (next) => {
    setError('');
    setInfo('');
    setView(next);
  };

  const clearPasswordFields = () => {
    setNewPassword('');
    setConfirmPassword('');
  };

  /* ---------------- Login ---------------- */

  const handleRoleChange = (e) => {
    setError('');
    setFormData({ role: e.target.value, userId: '', password: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getUserIdPlaceholder = () => {
    switch (formData.role) {
      case 'Admin':
        return 'e.g. A001';
      case 'Lecturer':
        return 'e.g. L001';
      case 'Technician':
        return 'e.g. T001';
      default:
        return 'Enter User ID';
    }
  };

  // Users with a temporary password must set their own before entering the system
  const completeLogin = (user, source) => {
    if (user.mustChangePassword) {
      setPending({ user, source });
      clearPasswordFields();
      setError('');
      setInfo('Welcome! You signed in with a temporary password. Set your own password to continue.');
      setView('change');
      return;
    }
    if (onLogin) onLogin(user);
  };

   const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // Guest Student Access
    if (formData.role === 'Student') {
      setActor(null);
      logActivity(null, 'Guest student opened the portal');
      if (onLogin) onLogin({ role: 'student', userId: 'GUEST_STUDENT', fullName: 'Guest Student' });
      return;
    }

    // 1) Try the database (backend)
    try {
      const response = await fetch('http://localhost:8080/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        if (String(data.role || '').toLowerCase() === formData.role.toLowerCase()) {
          setActor(data.userId);
          logActivity(data.userId, 'Signed in');
          if (onLogin) onLogin({ ...data, fullName: data.fullName ?? data.name });
          return;
        }
      }
    } catch (err) {
      console.warn('Backend unavailable, using LocalStorage fallback.');
    }

    // 2) Fallback: users saved in this browser
    const users = JSON.parse(localStorage.getItem('labsync_users') || '[]');
    const validUser = users.find(
      (u) =>
        String(u.userId).trim().toLowerCase() === String(formData.userId).trim().toLowerCase() &&
        u.password === formData.password &&
        u.role.toLowerCase() === formData.role.toLowerCase()
    );

    if (validUser) {
      setActor(validUser.userId);
      logActivity(validUser.userId, 'Signed in');
      if (onLogin) onLogin(validUser);
    } else {
      logActivity(null, `Failed sign-in attempt for ID ${formData.userId}`);
      setError('Invalid User ID, password, or role. Check your details and try again.');
    }
  };

 //First login: set your own password 

  const checkNewPassword = () => {
    if (!isStrongPassword(newPassword)) {
      setError('Your password must meet every requirement listed below.');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const changeFirstPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!pending) return;
    if (!checkNewPassword()) return;
    if (newPassword === formData.password) {
      setError('Choose a password that is different from the temporary one.');
      return;
    }
    setLoading(true);

    const { user, source } = pending;
    let savedOnServer = false;

    if (source === 'api') {
      try {
        const res = await post('change-password', {
          userId: user.userId,
          currentPassword: formData.password,
          newPassword
        });
        if (!res.ok) {
          setError('Could not save your password. Please try again.');
          setLoading(false);
          return;
        }
        savedOnServer = true;
      } catch (err) {
        console.warn('Backend unavailable, using LocalStorage fallback.');
      }
    }

    // Keep the LocalStorage copy in sync (also the fallback when the backend is down)
    savePasswordLocally((u) => String(u.userId).toLowerCase() === String(user.userId).toLowerCase(), newPassword);

    setLoading(false);
    const finished = { ...user, password: savedOnServer ? undefined : newPassword, mustChangePassword: false };
    setPending(null);
    clearPasswordFields();
    setFormData((prev) => ({ ...prev, password: '' }));
    if (onLogin) onLogin(finished);
  };

  const cancelFirstLogin = () => {
    setPending(null);
    clearPasswordFields();
    setFormData((prev) => ({ ...prev, password: '' }));
    goTo('login');
  };

  //Forgot password

  // Step 1: request OTP (sent to the email the admin registered)
  const requestOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await post('forgot-password', { email: email.trim() });
      if (res.ok) {
        setOtp(Array(OTP_LENGTH).fill(''));
        setCountdown(RESEND_SECONDS);
        setInfo(`We sent a ${OTP_LENGTH}-digit code to ${email.trim()}.`);
        setView('otp');
        setLoading(false);
        return;
      }
      if (res.status === 404) {
        setError('This email is not registered. Use the email your administrator gave for your account.');
        setLoading(false);
        return;
      }
      setError('Could not send the code. Please try again.');
      setLoading(false);
      return;
    } catch (err) {
      console.warn('Backend unavailable, using LocalStorage demo fallback.');
    }

    // DEMO fallback (no real email is sent). Remove once the backend is ready.
    const found = readUsers().find((u) => String(u.email || '').toLowerCase() === email.trim().toLowerCase());
    if (!found) {
      setError('This email is not registered. Use the email your administrator gave for your account.');
      setLoading(false);
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem(
      'labsync_otp',
      JSON.stringify({ email: email.trim().toLowerCase(), code, expires: Date.now() + 5 * 60 * 1000 })
    );
    console.log('[DEMO] Your OTP code is:', code);
    setOtp(Array(OTP_LENGTH).fill(''));
    setCountdown(RESEND_SECONDS);
    setInfo('Demo mode: the code is printed in the browser console.');
    setView('otp');
    setLoading(false);
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    setOtp(Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] || ''));
    otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  // verify OTP
  const verifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      setError(`Enter all ${OTP_LENGTH} digits of the code.`);
      return;
    }
    setLoading(true);

    try {
      const res = await post('verify-otp', { email: email.trim(), otp: code });
      if (res.ok) {
        setLoading(false);
        clearPasswordFields();
        goTo('reset');
        return;
      }
      setError('That code is incorrect or has expired. Check it or request a new one.');
      setLoading(false);
      return;
    } catch (err) {
      console.warn('Backend unavailable, using LocalStorage demo fallback.');
    }

    const saved = JSON.parse(sessionStorage.getItem('labsync_otp') || 'null');
    if (saved && saved.email === email.trim().toLowerCase() && saved.code === code && Date.now() < saved.expires) {
      setLoading(false);
      clearPasswordFields();
      goTo('reset');
    } else {
      setError('That code is incorrect or has expired. Check it or request a new one.');
      setLoading(false);
    }
  };

  // set new password
  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!checkNewPassword()) return;
    setLoading(true);

    const matchEmail = (u) => String(u.email || '').toLowerCase() === email.trim().toLowerCase();
    let done = false;

    try {
      const res = await post('reset-password', {
        email: email.trim(),
        otp: otp.join(''),
        newPassword
      });
      if (res.ok) {
        savePasswordLocally(matchEmail, newPassword);
        done = true;
      } else {
        setError('Could not reset the password. Request a new code and try again.');
        setLoading(false);
        return;
      }
    } catch (err) {
      // DEMO fallback: update the password in LocalStorage
      savePasswordLocally(matchEmail, newPassword);
      sessionStorage.removeItem('labsync_otp');
      done = true;
    }

    setLoading(false);
    if (done) {
      const user = readUsers().find(matchEmail);
      setEmail('');
      setOtp(Array(OTP_LENGTH).fill(''));
      clearPasswordFields();
      setFormData({ role: user?.role || 'Lecturer', userId: '', password: '' });
      setView('login');
      setInfo('Password updated. Sign in with your new password.');
    }
  };

  /* ---------------- Render ---------------- */

  const headings = {
    login: isStudent ? 'Guest student portal' : 'Sign in',
    change: 'Create your password',
    forgot: 'Forgot password?',
    otp: 'Check your email',
    reset: 'Set a new password'
  };

  const renderPasswordFields = (autoFocus) => (
    <>
      <div className="form-group">
        <label htmlFor="newPassword">New password</label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          placeholder="Create a strong password"
          autoFocus={autoFocus}
        />
      </div>
      <PasswordChecklist password={newPassword} />
      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Re-enter new password"
        />
        {confirmPassword && newPassword !== confirmPassword && (
          <span className="field-error">Passwords do not match yet.</span>
        )}
      </div>
    </>
  );

  return (
    <div className="login-container">
      <div className="login-shell">
        {/* Left: welcome panel */}
        <aside className="welcome-panel">
          <div className="logo-badge">
            <img src={logo} alt="Campus Logo" className="campus-logo" />
          </div>
          <h1 className="welcome-title">Welcome to LabSync</h1>
          <span className="welcome-line" />
          <p className="welcome-text">
            Book and manage lab resources for the Department of Information Technology.
          </p>
          <p className="university-title">Sabaragamuwa University of Sri Lanka</p>
        </aside>

        {/* Right: glass card */}
        <section className="login-card">
          <img src={logo} alt="" className="card-logo" />
          <h2 className="form-type-heading">{headings[view]}</h2>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          {info && !error && (
            <div className="alert alert-info" role="status">
              {info}
            </div>
          )}

          {/* LOGIN */}
          {view === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select id="role" name="role" value={formData.role} onChange={handleRoleChange}>
                  <option value="Student">Student (Guest Access)</option>
                  <option value="Lecturer">Lecturer</option>
                  <option value="Technician">Technician</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {!isStudent && (
                <>
                  <div className="form-group">
                    <label htmlFor="userId">User ID</label>
                    <input
                      id="userId"
                      type="text"
                      name="userId"
                      value={formData.userId}
                      onChange={handleChange}
                      required
                      placeholder={getUserIdPlaceholder()}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      id="password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Enter password"
                    />
                  </div>

                  <div className="link-row">
                    <button type="button" className="link-btn" onClick={() => goTo('forgot')}>
                      Forgot password?
                    </button>
                  </div>
                </>
              )}

              <button type="submit" className="login-btn">
                {isStudent ? 'Continue as guest student' : 'Sign in'}
              </button>

              {!isStudent && (
                <p className="hint-text">
                  Your administrator gives you a temporary password. You will set your own the first time you sign in.
                </p>
              )}
            </form>
          )}

          {/* FIRST LOGIN: CREATE OWN PASSWORD */}
          {view === 'change' && (
            <form onSubmit={changeFirstPassword}>
              {renderPasswordFields(true)}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Saving…' : 'Save password and continue'}
              </button>
              <div className="link-row center">
                <button type="button" className="link-btn" onClick={cancelFirstLogin}>
                  Back to sign in
                </button>
              </div>
            </form>
          )}

          {/* STEP 1: EMAIL */}
          {view === 'forgot' && (
            <form onSubmit={requestOtp}>
              <p className="step-text">
                Enter the email your administrator registered for your account. We'll send a verification code to it.
              </p>
              <div className="form-group">
                <label htmlFor="email">Registered email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@sab.ac.lk"
                  autoFocus
                />
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Sending code…' : 'Send code'}
              </button>
              <div className="link-row center">
                <button type="button" className="link-btn" onClick={() => goTo('login')}>
                  Back to sign in
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: OTP */}
          {view === 'otp' && (
            <form onSubmit={verifyOtp}>
              <div className="otp-row" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    className="otp-box"
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify code'}
              </button>
              <div className="link-row center">
                {countdown > 0 ? (
                  <span className="muted">Resend code in {countdown}s</span>
                ) : (
                  <button type="button" className="link-btn" onClick={() => requestOtp()}>
                    Resend code
                  </button>
                )}
              </div>
              <div className="link-row center">
                <button type="button" className="link-btn" onClick={() => goTo('forgot')}>
                  Use a different email
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {view === 'reset' && (
            <form onSubmit={resetPassword}>
              {renderPasswordFields(true)}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

export default LoginForm;