import React, { useEffect, useState } from 'react';
import Header from './Header';
import Dashboard from './Dashboard';
import Labs from './Labs';
import Computers from './Computers';
import FaultTickets from './FaultTickets';
import Reservations from './Reservations';
import { getLabs, getAssets, getFaultReports, getReservations } from './api';
import LoginForm from './LoginForm';
import Landing from './Landing';
import UserManagement from './UserManagement';
import Footer from './Footer';
import { motion } from 'framer-motion';
import ActivityLog from './Activitylog';

// Older versions kept the login in localStorage, which never expires. Remove it,
// so opening the site in a new tab / after closing the browser starts at the landing page.
['labsync_is_logged_in', 'labsync_user_role', 'labsync_user', 'labsync_active_tab'].forEach((k) => localStorage.removeItem(k));

// ✅ SAFE RENDER COMPONENT
const SafeRender = ({ Component, props, name }) => {
  if (typeof Component === 'function') {
    return <Component {...props} />;
  }
  console.warn(`[LabSync Error]: Component "${name}" is not a valid React component.`);
  return <div style={{ padding: '20px', color: '#c0392b', fontWeight: 'bold' }}>⚠️ Failed to load component: {name}</div>;
};

const layoutCss = `
.ls-content { margin-left:var(--ls-side, 248px); padding-top:64px; min-height:100vh; display:flex; flex-direction:column; transition:margin-left .2s ease; }
@media (max-width:900px) { .ls-content { margin-left:0; } }
.ls-toasts { position:fixed; right:20px; bottom:20px; z-index:3000; display:flex; flex-direction:column; gap:10px; }
.ls-toast { display:flex; align-items:center; gap:10px; max-width:360px; padding:12px 16px; border-radius:12px; background:#1f2433; color:#fff; font-size:13.5px; font-weight:600;
  box-shadow:0 12px 30px rgba(0,0,0,.28); border-left:5px solid #16a34a; animation:ls-toast-in .25s ease; }
.ls-toast.error { border-left-color:#e5484d; }
@keyframes ls-toast-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
`;

function App() {
  // 1. Users State
  const [users, setUsers] = useState(() => {
    const savedUsers = localStorage.getItem('labsync_users');
    if (savedUsers) return JSON.parse(savedUsers);
    return [
      { userId: 'A001', fullName: 'System Admin', email: 'admin@sab.ac.lk', password: '123', role: 'Admin' },
      { userId: 'L001', fullName: 'Mr. John Doe', email: 'lecturer@sab.ac.lk', password: '123', role: 'Lecturer' },
      { userId: 'T001', fullName: 'Tech Staff', email: 'tech@sab.ac.lk', password: '123', role: 'Technician' }
    ];
  });

  const refreshUsers = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      const updatedUsers = data.map((u) => ({
        ...u,
        userId: u.userId ?? u.userID ?? u.id,
        fullName: u.fullName ?? u.name ?? '',
      }));
      setUsers(updatedUsers);
    } catch (error) {
      console.error('Error refreshing users:', error);
    }
  };

  useEffect(() => {
    localStorage.setItem('labsync_users', JSON.stringify(users));
  }, [users]);
  useEffect(() => {
  refreshUsers();

  // Refresh user details when returning to the dashboard tab
  const handleFocus = () => refreshUsers();

  window.addEventListener('focus', handleFocus);

  return () => {
    window.removeEventListener('focus', handleFocus);
  };
}, []);

  // 2. Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('labsync_is_logged_in') === 'true';
  });

  const [userRole, setUserRole] = useState(() => {
    return sessionStorage.getItem('labsync_user_role') || 'student';
  });

  // The person who actually logged in (saved so a page refresh keeps the name)
  const [loggedUser, setLoggedUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('labsync_user') || 'null');
    } catch (e) {
      return null;
    }
  });

  // false = public landing page, true = login form
  const [showLogin, setShowLogin] = useState(false);

  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('labsync_active_tab') || 'home';
  });

  // 3. Selected Lab State (Fix for Lab Filter & Header)
  const [selectedLab, setSelectedLab] = useState(''); // '' = show all labs (overview)

  // 4. Data States
  const [labs, setLabs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [faults, setFaults] = useState([]);
  const [reservations, setReservations] = useState([]);

  // 5. Form Data States
  const [formData, setFormData] = useState({
    labID: '',
    assetID: '',
    computerNo: '',
    faultType: 'computer',
    equipmentType: '',
    description: '',
    reportedBy: '',
    priority: 'Medium'
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Small pop-up messages (replaces alert())
  const [toasts, setToasts] = useState([]);
  const showToast = (text, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  // The logged-in user: match by id in the users list, else use what the login returned,
  // else fall back to the first user with the same role.
  const byId = loggedUser?.userId
  ? users?.find(
      (u) => String(u.userId) === String(loggedUser.userId)
    )
  : null;

const currentUser =
  byId ||
  (loggedUser?.email
    ? users?.find(
        (u) => u.email?.toLowerCase() === loggedUser.email.toLowerCase()
      )
    : null) ||
  loggedUser ||
  users?.find(
    (u) => u.role?.toLowerCase() === userRole?.toLowerCase()
  ) ||
  null;
  const fetchAllData = () => {
    getLabs().then(res => setLabs(Array.isArray(res.data) ? res.data : [])).catch(err => console.error(err));
    getAssets().then(res => setAssets(Array.isArray(res.data) ? res.data : [])).catch(err => console.error(err));
    getFaultReports().then(res => setFaults(Array.isArray(res.data) ? res.data : [])).catch(err => console.error(err));
    getReservations().then(res => setReservations(Array.isArray(res.data) ? res.data : [])).catch(err => console.error(err));
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchAllData();
    }
  }, [isLoggedIn]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    sessionStorage.setItem('labsync_active_tab', tab);
  };

  // Used by the Home page cards / buttons. Opening "Labs" from Home should show ALL labs,
  // not the lab that was selected earlier (e.g. CC1).
  const openFromDashboard = (tab) => {
    if (tab === 'labs') setSelectedLab('');
    handleTabChange(tab);
  };

  const handleSubmitFault = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setMessage('');

    const isEquipment = formData.faultType === 'equipment';
    const finalLabId = Number(formData.labID || formData.labId);
    const finalUserId = currentUser?.userID || currentUser?.userId || formData.reporterId || 'A001';

    // Validation
    if (!finalLabId) {
      setMessage('❌ Please select a laboratory.');
      setSubmitting(false);
      return;
    }
    if (isEquipment && !formData.equipmentType) {
      setMessage('❌ Please select the equipment type.');
      setSubmitting(false);
      return;
    }
    if (!isEquipment && !formData.assetID) {
      setMessage('❌ Please select a computer.');
      setSubmitting(false);
      return;
    }

    const faultPayload = {
      labID: finalLabId,
      assetID: isEquipment ? null : Number(formData.assetID),
      faultType: isEquipment ? 'equipment' : 'computer',
      equipmentType: isEquipment ? formData.equipmentType : null,
      userID: finalUserId,
      issueDescription: formData.description,
      priority: formData.priority || 'Medium',
      status: 'Pending Repair'
    };

    try {
      const response = await fetch('http://localhost:8080/api/fault-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faultPayload)
      });

      if (response.ok) {
        setMessage('✅ Fault Report submitted successfully!');
        setFormData({
          labID: '',
          assetID: '',
          computerNo: '',
          faultType: 'computer',
          equipmentType: '',
          description: '',
          priority: 'Medium'
        });
        fetchAllData();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorText = await response.text();
        console.error('Backend Error Response:', errorText);
        setMessage(`❌ Failed to submit: ${response.status}`);
      }
    } catch (error) {
      console.error('Submit Error:', error);
      setMessage('❌ Server connection error.');
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ handleFixTicket (matches Spring Boot Controller /{id}/status)
  const handleFixTicket = async (reportId, newStatus = 'Resolved') => {
    console.log("Attempting to update Report ID:", reportId, "with Status:", newStatus);

    if (!reportId) {
      showToast('Report ID is missing or invalid.', 'error');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/api/fault-reports/${reportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        if (newStatus.toLowerCase() === 'resolved') {
          showToast('Ticket marked as resolved.', 'success');
        }
        setFaults((prevReports) =>
          prevReports.map((report) => {
            const id = report.reportID || report.reportId || report.id;
            return String(id) === String(reportId) ? { ...report, status: newStatus } : report;
          })
        );
      } else {
        const errorMsg = await response.text();
        console.error("Backend Error Response:", errorMsg);
        showToast(`Could not update the ticket (error ${response.status}).`, 'error');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Server connection error.', 'error');
    }
  };

  const handleUpdateStatus = handleFixTicket;

  const handleLogin = (userData) => {
    const u = userData?.user || userData || {};
    const role = (userData?.role || u.role) ? String(userData?.role || u.role).toLowerCase() : 'student';

    // Keep who logged in, so the header can show the name
    const info = {
      userId: u.userId ?? u.userID ?? u.id ?? '',
      fullName: u.fullName ?? u.name ?? u.username ?? '',
      email: u.email ?? '',
      role
    };

    setUserRole(role);
    setLoggedUser(info);
    setIsLoggedIn(true);
    setActiveTab('home');
    sessionStorage.setItem('labsync_active_tab', 'home');

    sessionStorage.setItem('labsync_is_logged_in', 'true');
    sessionStorage.setItem('labsync_user_role', role);
    sessionStorage.setItem('labsync_user', JSON.stringify(info));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('student');
    setLoggedUser(null);
    setShowLogin(false); // back to the landing page
    setActiveTab('home');

    sessionStorage.removeItem('labsync_is_logged_in');
    sessionStorage.removeItem('labsync_user_role');
    sessionStorage.removeItem('labsync_user');
    sessionStorage.removeItem('labsync_active_tab');
  };

  // ---------- Before login: landing page, then the login form ----------
  if (!isLoggedIn) {
    if (!showLogin) {
      return (
        <div className="App">
          <SafeRender Component={Landing} props={{ onLoginClick: () => setShowLogin(true) }} name="Landing" />
        </div>
      );
    }

    return (
      <div className="App" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setShowLogin(false)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 2000,
            background: '#ffffff',
            color: '#a31f2c',
            border: '1px solid #e8eaf0',
            borderRadius: '999px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
          }}
        >
          ← Back to home
        </button>
        <SafeRender Component={LoginForm} props={{ onLogin: handleLogin }} name="LoginForm" />
      </div>
    );
  }

  const normalizedRole = userRole ? String(userRole).trim().toLowerCase() : '';

  const openFaultsCount = faults.filter(
    (f) => !['resolved', 'fixed', 'done', 'closed', 'completed'].includes(String(f.status || '').toLowerCase())
  ).length;
  const pendingReservationsCount = reservations.filter(
    (r) => String(r.status || 'Pending').toLowerCase() === 'pending'
  ).length;

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <style>{layoutCss}</style>

      {/* 1. SIDEBAR + TOP BAR */}
      <SafeRender
        Component={Header}
        props={{
          activeTab,
          setActiveTab: handleTabChange,
          userRole,
          currentUser,
          onLogout: handleLogout,
          selectedLab,
          setSelectedLab,
          openFaultsCount,
          pendingReservationsCount
        }}
        name="Header"
      />

      {/* 2. CONTENT COLUMN (sits to the right of the sidebar) */}
      <div className="ls-content">
      {/* 2. MAIN CONTENT AREA */}
      <main style={{ flex: 1, width: '100%' }}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'home' && (
            <SafeRender Component={Dashboard} props={{ labs, assets, faults, reservations, currentUser, setActiveTab: openFromDashboard }} name="Dashboard" />
          )}

          {activeTab !== 'home' && (
            <div style={{ maxWidth: '1150px', margin: '25px auto', padding: '0 20px' }}>
              {activeTab === 'labs' && (
                <SafeRender Component={Labs} props={{ labs, faults, selectedLab, setSelectedLab }} name="Labs" />
              )}

              {/* userRole is passed so only Admin sees Add / Edit / Delete */}
              {activeTab === 'assets' && (
                <SafeRender
                  Component={Computers}
                  props={{ labs, assets, setAssets, faultReports: faults, userRole: normalizedRole }}
                  name="Computers"
                />
              )}

              {activeTab === 'faults' && (
                <SafeRender
                  Component={FaultTickets}
                  props={{
                    userRole,
                    currentUser,
                    labs,
                    assets,
                    faults,
                    formData,
                    setFormData,
                    handleSubmitFault,
                    submitting,
                    message,
                    handleFixTicket,
                    handleUpdateStatus
                  }}
                  name="FaultTickets"
                />
              )}

              {activeTab === 'reservations' && (
                <SafeRender Component={Reservations} props={{ reservations, labs, userRole, fetchAllData }} name="Reservations" />
              )}

             {activeTab === 'users' && normalizedRole === 'admin' && (
  <SafeRender
    Component={UserManagement}
    props={{
      currentUserId: currentUser?.userId,
      onUsersUpdated: refreshUsers
    }}
    name="UserManagement"
  />
)}
              {activeTab === 'activity' && userRole === 'admin' && <ActivityLog userRole={userRole} />}
            </div>
          )}
        </motion.div>
      </main>

      {/* 3. FOOTER */}
        <SafeRender Component={Footer} name="Footer" />
      </div>

      {/* 4. TOASTS */}
      <div className="ls-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ls-toast ${t.type}`}>
            <span>{t.type === 'error' ? '⚠️' : '✅'}</span>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;