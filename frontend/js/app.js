/**
 * Hospital Management System (HMS) - Core Frontend Application
 * Handles authentication lifecycle, RBAC, clinical workflows, modals, notifications & AI assistant.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global Application State
  const state = {
    currentView: 'overview',
    currentUser: null,
    departments: [],
    doctors: [],
    patients: [],
    appointments: [],
    wards: [],
    beds: [],
    medicines: [],
    labTests: [],
    labOrders: [],
    notifications: [],
    records: [],
    billing: []
  };

  // DOM Elements
  const authPortal = document.getElementById('auth-portal');
  const appContainer = document.getElementById('app-container');
  const sidebar = document.getElementById('app-sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const pageTitle = document.getElementById('current-page-title');
  const breadcrumb = document.getElementById('current-breadcrumb');
  const toastContainer = document.getElementById('toast-container');
  const notifDropdown = document.getElementById('notifications-dropdown');
  const notifBadge = document.getElementById('notification-badge-count');
  const aiDrawer = document.getElementById('ai-chat-drawer');

  // Views Map
  const viewContainers = {
    overview: document.getElementById('view-overview'),
    patients: document.getElementById('view-patients'),
    doctors: document.getElementById('view-doctors'),
    appointments: document.getElementById('view-appointments'),
    wards: document.getElementById('view-wards'),
    nurses: document.getElementById('view-nurses'),
    laboratory: document.getElementById('view-laboratory'),
    pharmacy: document.getElementById('view-pharmacy'),
    records: document.getElementById('view-records'),
    billing: document.getElementById('view-billing')
  };

  // Start initialization
  init();

  async function init() {
    setupAuthTabs();
    setupAuthForms();
    setupNavigation();
    setupMobileSidebar();
    setupModals();
    setupAiChat();

    // Check existing authentication session
    const token = api.getToken();
    const storedUser = api.getUser();

    if (token && storedUser) {
      try {
        const meRes = await api.getMe();
        state.currentUser = meRes.user || storedUser;
        api.setUser(state.currentUser);
        launchAuthenticatedApp();
      } catch (err) {
        console.warn('Session expired or invalid, showing auth screen:', err.message);
        showAuthScreen();
      }
    } else {
      showAuthScreen();
    }
  }

  // =========================================================================
  // AUTHENTICATION & SESSION HANDLING
  // =========================================================================
  function showAuthScreen() {
    if (authPortal) authPortal.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
  }

  function launchAuthenticatedApp() {
    if (authPortal) authPortal.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';

    renderUserMeta();
    applyRbacRules();
    loadReferenceData();
    loadNotifications();
    switchView('overview');
  }

  function renderUserMeta() {
    if (!state.currentUser) return;
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    const avatarEl = document.getElementById('user-display-avatar');

    if (nameEl) nameEl.textContent = state.currentUser.name || 'Healthcare User';
    if (roleEl) roleEl.textContent = (state.currentUser.role || 'user').toUpperCase();
    if (avatarEl) avatarEl.textContent = (state.currentUser.name || 'U').charAt(0).toUpperCase();
  }

  function applyRbacRules() {
    const role = state.currentUser ? state.currentUser.role : 'patient';
    const navItems = document.querySelectorAll('.nav-item[data-roles], .nav-label[data-roles]');

    navItems.forEach(el => {
      const allowedRoles = el.getAttribute('data-roles').split(',').map(r => r.trim());
      if (allowedRoles.includes(role)) {
        el.style.display = 'flex';
      } else {
        el.style.display = 'none';
      }
    });
  }

  function setupAuthTabs() {
    const tabBtns = document.querySelectorAll('.auth-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        window.switchAuthTab(targetTab);
      });
    });
  }

  window.switchAuthTab = function (tabName) {
    document.querySelectorAll('.auth-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
    });

    const panes = {
      login: document.getElementById('form-auth-login'),
      register: document.getElementById('form-auth-register'),
      forgot: document.getElementById('form-auth-forgot')
    };

    Object.keys(panes).forEach(k => {
      if (panes[k]) {
        panes[k].style.display = k === tabName ? 'block' : 'none';
      }
    });
  };

  window.togglePasswordVisibility = function (inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  };

  function setupAuthForms() {
    // 1. Login Form
    const loginForm = document.getElementById('form-auth-login');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('btn-login-submit');

        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Authenticating...';

          const res = await api.login(email, password);
          state.currentUser = res.user;
          showToast(`Welcome back, ${res.user.name}!`, 'success');
          launchAuthenticatedApp();
        } catch (err) {
          showToast(err.message || 'Invalid credentials', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In to Portal';
        }
      });
    }

    // 2. Register Form
    const registerForm = document.getElementById('form-auth-register');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById('reg-name').value.trim(),
          email: document.getElementById('reg-email').value.trim(),
          password: document.getElementById('reg-password').value,
          phone: document.getElementById('reg-phone').value.trim(),
          role: document.getElementById('reg-role').value,
          gender: document.getElementById('reg-gender').value,
          dob: document.getElementById('reg-dob').value
        };

        const submitBtn = document.getElementById('btn-register-submit');
        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Creating account...';

          const res = await api.register(payload);
          showToast(res.message || 'Account created successfully! Please sign in.', 'success');

          // Switch to login tab and prefill
          window.switchAuthTab('login');
          document.getElementById('login-email').value = payload.email;
          document.getElementById('login-password').value = '';
          registerForm.reset();
        } catch (err) {
          showToast(err.message || 'Registration failed', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="bi bi-person-check"></i> Create Secure Account';
        }
      });
    }

    // 3. Forgot Password Form
    const forgotForm = document.getElementById('form-auth-forgot');
    if (forgotForm) {
      forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value.trim();
        const submitBtn = document.getElementById('btn-forgot-submit');

        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Requesting token...';

          const res = await api.forgotPassword(email);
          showToast('Password recovery token generated (1-hour validity).', 'success');

          // Show token box and prefill token for easy testing
          const tokenBox = document.getElementById('reset-token-box');
          if (tokenBox) {
            tokenBox.style.display = 'block';
            document.getElementById('reset-token-input').value = res.reset_token || '';
          }
        } catch (err) {
          showToast(err.message || 'Failed to request reset token', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="bi bi-send-check"></i> Generate Recovery Token';
        }
      });
    }
  }

  window.handleResetPasswordSubmit = async function () {
    const token = document.getElementById('reset-token-input').value.trim();
    const newPassword = document.getElementById('reset-new-password').value;

    if (!token || !newPassword) {
      showToast('Please enter both recovery token and new password', 'error');
      return;
    }

    try {
      const res = await api.resetPassword(token, newPassword);
      showToast(res.message || 'Password updated successfully! Please login.', 'success');
      window.switchAuthTab('login');
      document.getElementById('reset-token-box').style.display = 'none';
      document.getElementById('form-auth-forgot').reset();
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    }
  };

  // 1-Click Demo Login
  window.quickDemoLogin = async function (email, password) {
    try {
      showToast(`Logging in as ${email}...`, 'info');
      const res = await api.login(email, password);
      state.currentUser = res.user;
      showToast(`Authenticated as ${res.user.name} (${res.user.role}).`, 'success');
      launchAuthenticatedApp();
    } catch (err) {
      showToast('Demo login failed: ' + err.message, 'error');
    }
  };

  window.handleLogout = function () {
    api.logout();
    state.currentUser = null;
    showToast('Logged out of clinical session.', 'info');
    showAuthScreen();
  };

  window.addEventListener('hms_unauthorized', () => {
    showToast('Session expired. Please sign in again.', 'error');
    showAuthScreen();
  });

  // =========================================================================
  // NAVIGATION & VIEW SWITCHER
  // =========================================================================
  function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        switchView(targetView);
        if (window.innerWidth <= 992 && sidebar) {
          sidebar.classList.remove('open');
        }
      });
    });
  }

  function setupMobileSidebar() {
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  }

  function switchView(viewName) {
    if (!viewContainers[viewName]) return;
    state.currentView = viewName;

    // Update active class on nav items
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    // Toggle views visibility
    Object.keys(viewContainers).forEach(key => {
      if (viewContainers[key]) {
        viewContainers[key].style.display = key === viewName ? 'block' : 'none';
      }
    });

    // Update Topbar Titles
    const titles = {
      overview: { title: 'Executive Dashboard', crumb: 'Hospital Overview & Real-Time KPIs' },
      patients: { title: 'Patients Registry', crumb: 'Demographics, EHR & Clinical Files' },
      doctors: { title: 'Doctors Directory', crumb: 'Specialists, OP Chambers & Scheduling' },
      appointments: { title: 'Appointments & Triage Queue', crumb: 'Outpatient Token Stream & Consultation Status' },
      wards: { title: 'Wards & Bed Matrix', crumb: 'Inpatient Census & Critical Care Occupancy' },
      nurses: { title: 'Nurse Station & Telemetry', crumb: 'Shift Rostering & Vital Signs Intake' },
      laboratory: { title: 'Laboratory Diagnostics', crumb: 'Specimen Orders, Hemogram & Pathology Sign-off' },
      pharmacy: { title: 'Pharmacy Inventory', crumb: 'Formulary Stock & Prescription Dispensing' },
      records: { title: 'Electronic Health Records (EHR)', crumb: 'Clinical Diagnoses, Notes & Medication History' },
      billing: { title: 'Billing & Financial Ledger', crumb: 'Outpatient Invoices & Settlement Gateway' }
    };

    if (pageTitle) pageTitle.textContent = titles[viewName]?.title || 'Dashboard';
    if (breadcrumb) breadcrumb.textContent = titles[viewName]?.crumb || 'Clinical Portal';

    // Route view-specific renderers
    switch (viewName) {
      case 'overview': renderOverviewView(); break;
      case 'patients': renderPatientsView(); break;
      case 'doctors': renderDoctorsView(); break;
      case 'appointments': renderAppointmentsView(); break;
      case 'wards': renderWardsView(); break;
      case 'nurses': renderNursesView(); break;
      case 'laboratory': renderLaboratoryView(); break;
      case 'pharmacy': renderPharmacyView(); break;
      case 'records': renderRecordsView(); break;
      case 'billing': renderBillingView(); break;
    }
  }

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  window.showToast = function (message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'bi-info-circle-fill';
    if (type === 'success') icon = 'bi-check-circle-fill';
    if (type === 'error') icon = 'bi-exclamation-triangle-fill';

    toast.innerHTML = `<i class="bi ${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  };

  // =========================================================================
  // NOTIFICATIONS SYSTEM
  // =========================================================================
  async function loadNotifications() {
    try {
      const res = await api.getNotifications();
      state.notifications = res.data || [];
      const unreadCount = state.notifications.filter(n => !n.is_read).length;

      if (notifBadge) {
        if (unreadCount > 0) {
          notifBadge.textContent = unreadCount;
          notifBadge.style.display = 'flex';
        } else {
          notifBadge.style.display = 'none';
        }
      }

      const listEl = document.getElementById('notifications-list');
      if (listEl) {
        if (!state.notifications.length) {
          listEl.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px;">No notifications.</div>';
          return;
        }

        listEl.innerHTML = state.notifications.map(n => `
          <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="window.markNotificationRead(${n.id})">
            <i class="bi ${n.type === 'Emergency' ? 'bi-exclamation-octagon-fill text-danger' : n.type === 'Appointment' ? 'bi-calendar-check text-primary' : 'bi-bell-fill text-info'}"></i>
            <div>
              <div style="font-weight: 600; color: var(--text-main);">${n.title}</div>
              <div style="color: var(--text-muted); font-size: 11px;">${n.message}</div>
              <div style="font-size: 10px; color: var(--text-light); margin-top: 2px;">${n.created_at || 'Recently'}</div>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      console.warn('Could not load notifications:', err.message);
    }
  }

  window.toggleNotificationsDropdown = function () {
    if (!notifDropdown) return;
    const isHidden = notifDropdown.style.display === 'none' || !notifDropdown.style.display;
    notifDropdown.style.display = isHidden ? 'block' : 'none';
  };

  window.markNotificationRead = async function (id) {
    try {
      await api.markNotificationRead(id);
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  window.markAllNotificationsRead = async function () {
    try {
      await api.markAllNotificationsRead();
      loadNotifications();
      showToast('All notifications marked as read', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Close notifications on outer click
  document.addEventListener('click', (e) => {
    if (notifDropdown && notifDropdown.style.display === 'block') {
      const wrap = document.querySelector('.notifications-dropdown-wrap');
      if (wrap && !wrap.contains(e.target)) {
        notifDropdown.style.display = 'none';
      }
    }
  });

  // =========================================================================
  // REFERENCE DATA LOADER
  // =========================================================================
  async function loadReferenceData() {
    try {
      const [deptRes, docRes] = await Promise.all([
        api.getDepartments(),
        api.getDoctors()
      ]);
      state.departments = deptRes.data || [];
      state.doctors = docRes.data || [];
    } catch (err) {
      console.warn('Failed to load initial reference data:', err.message);
    }
  }

  // =========================================================================
  // VIEW: OVERVIEW / DASHBOARD
  // =========================================================================
  async function renderOverviewView() {
    try {
      const [statsRes, aptRes, wardRes] = await Promise.all([
        api.getDashboardStats(),
        api.getAppointments(),
        api.getWards()
      ]);

      const stats = statsRes.stats || {};
      const totalPatEl = document.getElementById('stat-total-patients');
      const aptTodayEl = document.getElementById('stat-appointments-today');
      const docEl = document.getElementById('stat-active-doctors');
      const revEl = document.getElementById('stat-revenue');

      if (totalPatEl) totalPatEl.textContent = stats.total_patients || 0;
      if (aptTodayEl) aptTodayEl.textContent = stats.appointments_today || 0;
      if (docEl) docEl.textContent = stats.active_doctors || 0;
      if (revEl) revEl.textContent = `₹${parseFloat(stats.total_revenue_inr || 0).toLocaleString()}`;

      // Inpatient Ward Occupancy Snapshot pills
      const quickWards = document.getElementById('quick-ward-stats');
      if (quickWards && wardRes.data) {
        quickWards.innerHTML = wardRes.data.slice(0, 4).map(w => `
          <div style="background: var(--surface); border: 1px solid var(--border); padding: 6px 12px; border-radius: var(--radius-sm); font-size: 12px;">
            <strong>${w.name}</strong>: <span style="color: ${w.occupied_beds >= w.total_beds ? 'var(--danger)' : 'var(--primary)'}; font-weight: 700;">${w.occupied_beds}/${w.total_beds}</span>
          </div>
        `).join('');
      }

      // Today's appointments table
      const appointments = aptRes.data || [];
      const tbody = document.getElementById('overview-appointments-tbody');

      if (tbody) {
        if (!appointments.length) {
          tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="bi bi-calendar-x"></i><p>No appointments recorded for today.</p></td></tr>`;
          return;
        }

        tbody.innerHTML = appointments.slice(0, 6).map(apt => `
          <tr>
            <td><strong>${apt.appointment_number}</strong></td>
            <td>${apt.patient_name || 'Patient #' + apt.patient_id}</td>
            <td>${apt.doctor_name || 'Dr. Assigned'}</td>
            <td><span class="dept-pill">${apt.department_name || 'General'}</span></td>
            <td>${apt.appointment_time || '10:00 AM'} (Token #${apt.token_number || 1})</td>
            <td><span class="badge-status ${apt.status.toLowerCase()}">${apt.status}</span></td>
          </tr>
        `).join('');
      }
    } catch (err) {
      showToast('Failed to load dashboard metrics: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // VIEW: PATIENTS REGISTRY
  // =========================================================================
  async function renderPatientsView(searchQuery = '') {
    try {
      const res = await api.getPatients(searchQuery);
      state.patients = res.data || [];
      const tbody = document.getElementById('patients-tbody');
      if (!tbody) return;

      if (!state.patients.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="bi bi-person-x"></i><p>No patient records found.</p></td></tr>`;
        return;
      }

      tbody.innerHTML = state.patients.map(p => `
        <tr>
          <td><strong style="color: var(--primary);">${p.patient_code}</strong></td>
          <td>
            <div style="font-weight: 600;">${p.name}</div>
            <small style="color: var(--text-muted);">${p.gender}, DOB: ${p.dob}</small>
          </td>
          <td><span class="badge-status blood-group">${p.blood_group}</span></td>
          <td>${p.phone}</td>
          <td>${p.city || 'Chennai'}</td>
          <td><small>${p.insurance_provider || 'Self-Pay'}</small></td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="window.viewPatientDetails(${p.id})">
              <i class="bi bi-file-earmark-medical"></i> EHR
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Could not load patients: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // VIEW: DOCTORS & SPECIALTIES
  // =========================================================================
  async function renderDoctorsView(filterDeptId = null) {
    try {
      const [deptRes, docRes] = await Promise.all([
        api.getDepartments(),
        api.getDoctors(filterDeptId)
      ]);

      const depts = deptRes.data || [];
      const docs = docRes.data || [];

      // Render Department Filter Pills
      const filterPills = document.getElementById('dept-filter-pills');
      if (filterPills) {
        filterPills.innerHTML = `
          <button class="filter-pill ${filterDeptId === null ? 'active' : ''}" onclick="window.filterDoctorsByDept(null)">All Specialties</button>
        ` + depts.map(d => `
          <button class="filter-pill ${filterDeptId == d.id ? 'active' : ''}" onclick="window.filterDoctorsByDept(${d.id})">${d.name}</button>
        `).join('');
      }

      // Render Doctor Cards Grid
      const grid = document.getElementById('doctors-grid');
      if (grid) {
        if (!docs.length) {
          grid.innerHTML = '<div class="empty-state"><i class="bi bi-person-slash"></i><p>No doctors listed in this specialty.</p></div>';
          return;
        }

        grid.innerHTML = docs.map(doc => `
          <div class="doctor-card">
            <div class="doctor-card-header">
              <div class="doctor-avatar">${doc.name.charAt(4) || 'D'}</div>
              <div>
                <h4>${doc.name}</h4>
                <div class="doctor-spec">${doc.specialization || 'Consultant'}</div>
                <span class="dept-pill">${doc.department_name}</span>
              </div>
            </div>
            <div class="doctor-card-body">
              <div class="doctor-meta-item">
                <i class="bi bi-mortarboard"></i>
                <span>${doc.qualification || 'MBBS, MD'}</span>
              </div>
              <div class="doctor-meta-item">
                <i class="bi bi-clock"></i>
                <span>${doc.consulting_hours || 'Mon-Fri 09:00 - 16:00'} (Room ${doc.room_number || 'OPD-1'})</span>
              </div>
              <div class="doctor-meta-item">
                <i class="bi bi-cash-stack"></i>
                <span>Fee: ₹${parseFloat(doc.consultation_fee || 500).toFixed(0)}</span>
              </div>
            </div>
            <div class="doctor-card-footer">
              <button class="btn btn-primary btn-block btn-sm" onclick="window.openBookAppointmentModal(${doc.id}, ${doc.department_id})">
                <i class="bi bi-calendar-plus"></i> Book Consultation
              </button>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      showToast('Error loading doctors directory: ' + err.message, 'error');
    }
  }

  window.filterDoctorsByDept = function (deptId) {
    renderDoctorsView(deptId);
  };

  // =========================================================================
  // VIEW: APPOINTMENTS
  // =========================================================================
  async function renderAppointmentsView() {
    try {
      const res = await api.getAppointments();
      state.appointments = res.data || [];
      const tbody = document.getElementById('appointments-tbody');
      if (!tbody) return;

      if (!state.appointments.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="bi bi-calendar-x"></i><p>No scheduled appointments.</p></td></tr>`;
        return;
      }

      tbody.innerHTML = state.appointments.map(apt => `
        <tr>
          <td>
            <strong>${apt.appointment_number}</strong>
            <div><small style="color: var(--text-muted);">Token #${apt.token_number || 1}</small></div>
          </td>
          <td>
            <div style="font-weight: 600;">${apt.patient_name || 'Patient #' + apt.patient_id}</div>
            <small style="color: var(--text-muted);">${apt.patient_phone || ''}</small>
          </td>
          <td>
            <div style="font-weight: 600;">${apt.doctor_name || 'Consultant'}</div>
            <small class="dept-pill">${apt.department_name || 'General'}</small>
          </td>
          <td>
            <div>${apt.appointment_date}</div>
            <small style="color: var(--text-muted);">${apt.appointment_time}</small>
          </td>
          <td><span style="font-size: 13px;">${apt.reason || 'General Consult'}</span></td>
          <td><span class="badge-status ${apt.status.toLowerCase()}">${apt.status}</span></td>
          <td>
            <select class="form-select form-select-sm" style="width: auto; display: inline-block; font-size: 12px;" onchange="window.updateStatus(${apt.id}, this.value)">
              <option value="Scheduled" ${apt.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
              <option value="Checked-In" ${apt.status === 'Checked-In' ? 'selected' : ''}>Checked-In</option>
              <option value="In-Consultation" ${apt.status === 'In-Consultation' ? 'selected' : ''}>In-Consult</option>
              <option value="Completed" ${apt.status === 'Completed' ? 'selected' : ''}>Completed</option>
              <option value="Cancelled" ${apt.status === 'Cancelled' ? 'selected' : ''}>Cancel</option>
            </select>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Could not load appointments: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // VIEW: WARDS & INPATIENT BED MATRIX
  // =========================================================================
  async function renderWardsView(wardFilter = null) {
    try {
      const [wardRes, bedRes] = await Promise.all([
        api.getWards(),
        api.getBeds(wardFilter)
      ]);

      state.wards = wardRes.data || [];
      state.beds = bedRes.data || [];

      // Render summary cards per ward
      const summaryContainer = document.getElementById('wards-summary-container');
      if (summaryContainer) {
        summaryContainer.innerHTML = state.wards.map(w => {
          const occPct = Math.min(100, Math.round((w.occupied_beds / w.total_beds) * 100));
          return `
            <div class="ward-summary-card">
              <h5><i class="bi bi-door-closed"></i> ${w.name}</h5>
              <div style="font-size: 12px; color: var(--text-muted);">${w.type} Ward</div>
              <div class="ward-progress-bar">
                <div class="ward-progress-fill" style="width: ${occPct}%; background: ${occPct >= 90 ? 'var(--danger)' : occPct >= 70 ? 'var(--warning)' : 'var(--primary)'};"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600;">
                <span>Occupied: ${w.occupied_beds}/${w.total_beds}</span>
                <span>${occPct}%</span>
              </div>
            </div>
          `;
        }).join('');
      }

      // Populate ward filter dropdown
      const filterSelect = document.getElementById('bed-ward-filter');
      if (filterSelect && !filterSelect.dataset.initialized) {
        filterSelect.innerHTML = `<option value="">All Hospital Wards</option>` +
          state.wards.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
        filterSelect.dataset.initialized = 'true';
        filterSelect.addEventListener('change', () => {
          renderWardsView(filterSelect.value || null);
        });
      }

      // Render bed cards matrix
      const bedContainer = document.getElementById('beds-container');
      if (bedContainer) {
        if (!state.beds.length) {
          bedContainer.innerHTML = '<div class="empty-state"><i class="bi bi-door-closed"></i><p>No beds configured in this ward.</p></div>';
          return;
        }

        bedContainer.innerHTML = state.beds.map(bed => {
          const statusLower = bed.status.toLowerCase();
          return `
            <div class="bed-card ${statusLower}" onclick="window.openBedManageModal(${bed.id}, '${bed.bed_number}', '${bed.ward_name}', '${bed.status}', ${bed.patient_id || 'null'})">
              <div class="bed-icon"><i class="bi bi-hospital"></i></div>
              <div class="bed-number">${bed.bed_number}</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">${bed.ward_name}</div>
              <div class="bed-status-text" style="color: ${bed.status === 'Available' ? 'var(--success)' : bed.status === 'Occupied' ? 'var(--info)' : 'var(--warning)'};">
                ${bed.status}
              </div>
              ${bed.patient_name ? `<div style="font-size: 10px; font-weight: 600; color: var(--text-main); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${bed.patient_name}</div>` : ''}
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      showToast('Could not load ward bed matrix: ' + err.message, 'error');
    }
  }

  window.openBedManageModal = async function (bedId, bedNumber, wardName, currentStatus, currentPatientId) {
    document.getElementById('manage-bed-id').value = bedId;
    document.getElementById('bed-modal-number').textContent = `Bed ${bedNumber}`;
    document.getElementById('bed-modal-ward').textContent = `Ward: ${wardName}`;
    document.getElementById('bed-modal-status').value = currentStatus;

    // Populate patient select
    const patRes = await api.getPatients();
    const patSelect = document.getElementById('bed-patient-select');
    if (patSelect) {
      patSelect.innerHTML = `<option value="">No Patient (Vacant)</option>` +
        (patRes.data || []).map(p => `<option value="${p.id}" ${p.id == currentPatientId ? 'selected' : ''}>${p.name} (${p.patient_code})</option>`).join('');
    }

    document.getElementById('modal-allocate-bed').classList.add('active');
  };

  // =========================================================================
  // VIEW: NURSE STATION & VITALS TELEMETRY
  // =========================================================================
  async function renderNursesView() {
    try {
      const [dutyRes, vitalsRes, patRes] = await Promise.all([
        api.getNurseDuty(),
        api.getNurseVitals(),
        api.getPatients()
      ]);

      // Roster Table
      const rosterTbody = document.getElementById('nurse-roster-tbody');
      if (rosterTbody) {
        const duty = dutyRes.data || [];
        if (!duty.length) {
          rosterTbody.innerHTML = '<tr><td colspan="4" class="empty-state">No nurses assigned.</td></tr>';
        } else {
          rosterTbody.innerHTML = duty.map(d => `
            <tr>
              <td><strong>${d.name}</strong></td>
              <td>${d.ward_name || 'General Ward'}</td>
              <td><span class="dept-pill">${d.shift || 'Day'}</span></td>
              <td><span class="badge-status ${d.status === 'On Duty' ? 'active' : 'inactive'}">${d.status}</span></td>
            </tr>
          `).join('');
        }
      }

      // Populate Vitals Patient Select
      const patSelect = document.getElementById('vitals-patient-select');
      if (patSelect) {
        patSelect.innerHTML = `<option value="">Select Inpatient / Outpatient</option>` +
          (patRes.data || []).map(p => `<option value="${p.id}">${p.name} (${p.patient_code})</option>`).join('');
      }

      // Vitals History Table
      const vitalsTbody = document.getElementById('vitals-history-tbody');
      if (vitalsTbody) {
        const vitals = vitalsRes.data || [];
        if (!vitals.length) {
          vitalsTbody.innerHTML = '<tr><td colspan="8" class="empty-state">No vitals logs recorded yet.</td></tr>';
        } else {
          vitalsTbody.innerHTML = vitals.map(v => `
            <tr>
              <td><small>${v.recorded_at}</small></td>
              <td><strong>${v.patient_name}</strong></td>
              <td><span style="font-weight: 700;">${v.blood_pressure || '--'}</span></td>
              <td>${v.heart_rate_bpm ? v.heart_rate_bpm + ' bpm' : '--'}</td>
              <td><span class="badge-status ${v.spo2_percentage && v.spo2_percentage < 95 ? 'inactive' : 'active'}">${v.spo2_percentage ? v.spo2_percentage + '%' : '--'}</span></td>
              <td>${v.temperature_f ? v.temperature_f + ' °F' : '--'}</td>
              <td>${v.blood_glucose_mg_dl ? v.blood_glucose_mg_dl + ' mg/dL' : '--'}</td>
              <td><small>${v.nurse_name || 'Staff Nurse'}</small></td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      showToast('Could not load nurse telemetry: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // VIEW: LABORATORY DIAGNOSTICS
  // =========================================================================
  async function renderLaboratoryView() {
    try {
      const [testsRes, ordersRes] = await Promise.all([
        api.getLabTests(),
        api.getLabOrders()
      ]);

      state.labTests = testsRes.data || [];
      state.labOrders = ordersRes.data || [];

      // Render Diagnostic Catalog
      const catalogEl = document.getElementById('lab-tests-catalog');
      if (catalogEl) {
        catalogEl.innerHTML = state.labTests.map(t => `
          <div class="lab-test-card">
            <strong>${t.test_name}</strong>
            <small><span class="dept-pill">${t.category}</span></small>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 13px;">
              <span>Fee: <strong>₹${parseFloat(t.price_inr).toFixed(0)}</strong></span>
              <span style="color: var(--text-muted); font-size: 11px;">TAT: ${t.turnaround_hours}h</span>
            </div>
          </div>
        `).join('');
      }

      // Render Orders Table
      const ordersTbody = document.getElementById('lab-orders-tbody');
      if (ordersTbody) {
        if (!state.labOrders.length) {
          ordersTbody.innerHTML = '<tr><td colspan="7" class="empty-state">No lab orders recorded.</td></tr>';
          return;
        }

        ordersTbody.innerHTML = state.labOrders.map(o => `
          <tr>
            <td><strong>${o.order_number}</strong></td>
            <td>${o.patient_name}</td>
            <td><strong>${o.test_name}</strong></td>
            <td><small>${o.order_date}</small></td>
            <td><span class="badge-status ${o.status.toLowerCase().replace(' ', '-')}">${o.status}</span></td>
            <td><small style="max-width: 200px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${o.result_summary || 'Awaiting lab analysis'}</small></td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="window.openLabResultModal(${o.id}, '${o.test_name}', '${o.patient_name}', '${o.status}', '${(o.result_summary || '').replace(/'/g, "\\'")}')">
                <i class="bi bi-pencil-square"></i> Process
              </button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      showToast('Could not load laboratory hub: ' + err.message, 'error');
    }
  }

  window.openNewLabOrderModal = async function () {
    const [patRes, testsRes, docRes] = await Promise.all([
      api.getPatients(),
      api.getLabTests(),
      api.getDoctors()
    ]);

    const patSel = document.getElementById('lab-order-patient-select');
    const testSel = document.getElementById('lab-order-test-select');
    const docSel = document.getElementById('lab-order-doctor-select');

    if (patSel) {
      patSel.innerHTML = (patRes.data || []).map(p => `<option value="${p.id}">${p.name} (${p.patient_code})</option>`).join('');
    }
    if (testSel) {
      testSel.innerHTML = (testsRes.data || []).map(t => `<option value="${t.id}">${t.test_name} (₹${t.price_inr})</option>`).join('');
    }
    if (docSel) {
      docSel.innerHTML = (docRes.data || []).map(d => `<option value="${d.id}">${d.name} (${d.department_name})</option>`).join('');
    }

    document.getElementById('modal-lab-order').classList.add('active');
  };

  window.openLabResultModal = function (orderId, testName, patientName, status, resultSummary) {
    document.getElementById('lab-result-order-id').value = orderId;
    document.getElementById('lab-result-test-title').textContent = testName;
    document.getElementById('lab-result-patient-title').textContent = `Patient: ${patientName}`;
    document.getElementById('lab-result-status').value = status === 'Ordered' ? 'In Progress' : status;
    document.getElementById('lab-result-text').value = resultSummary || '';

    document.getElementById('modal-lab-result').classList.add('active');
  };

  // =========================================================================
  // VIEW: PHARMACY INVENTORY
  // =========================================================================
  async function renderPharmacyView(search = '') {
    try {
      const res = await api.getMedicines(search);
      state.medicines = res.data || [];
      const tbody = document.getElementById('pharmacy-tbody');
      if (!tbody) return;

      if (!state.medicines.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No medicines found.</td></tr>';
        return;
      }

      tbody.innerHTML = state.medicines.map(m => {
        let statusBadge = '<span class="badge-status active">In Stock</span>';
        if (m.stock_quantity <= 0) {
          statusBadge = '<span class="badge-status inactive">Out of Stock</span>';
        } else if (m.stock_quantity <= m.reorder_level) {
          statusBadge = '<span class="badge-status pending">Low Stock</span>';
        }

        return `
          <tr>
            <td><strong>${m.item_code}</strong></td>
            <td>
              <div style="font-weight: 600;">${m.brand_name}</div>
              <small style="color: var(--text-muted);">${m.generic_name}</small>
            </td>
            <td>${m.dosage} <span class="dept-pill">${m.category}</span></td>
            <td><strong>${m.stock_quantity}</strong></td>
            <td>₹${parseFloat(m.unit_price_inr).toFixed(2)}</td>
            <td><small>${m.batch_number} (Exp: ${m.expiry_date})</small></td>
            <td>${statusBadge}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      showToast('Could not load pharmacy inventory: ' + err.message, 'error');
    }
  }

  window.openDispenseModal = async function () {
    const [patRes, medRes] = await Promise.all([
      api.getPatients(),
      api.getMedicines()
    ]);

    const patSel = document.getElementById('dispense-patient-select');
    const medSel = document.getElementById('dispense-medicine-select');

    if (patSel) {
      patSel.innerHTML = (patRes.data || []).map(p => `<option value="${p.id}">${p.name} (${p.patient_code})</option>`).join('');
    }
    if (medSel) {
      medSel.innerHTML = (medRes.data || []).filter(m => m.stock_quantity > 0).map(m => `
        <option value="${m.id}">${m.brand_name} (${m.generic_name}) - Stock: ${m.stock_quantity}</option>
      `).join('');
    }

    document.getElementById('modal-dispense-med').classList.add('active');
  };

  // =========================================================================
  // VIEW: ELECTRONIC HEALTH RECORDS (EHR)
  // =========================================================================
  async function renderRecordsView() {
    try {
      const res = await api.getMedicalRecords();
      state.records = res.data || [];
      const container = document.getElementById('records-list-container');
      if (!container) return;

      if (!state.records.length) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-file-earmark-x"></i><p>No EHR clinical records found.</p></div>';
        return;
      }

      container.innerHTML = state.records.map(rec => `
        <div class="card-box" style="margin-bottom: 16px;">
          <div class="card-header-flex">
            <div>
              <h4 style="font-size: 16px; margin: 0; color: var(--text-main);">${rec.patient_name} (${rec.patient_code})</h4>
              <div class="card-subtitle">Consulted with ${rec.doctor_name} (${rec.department_name}) on ${rec.visit_date}</div>
            </div>
            <span class="badge-status completed"><i class="bi bi-check-circle"></i> Signed Record</span>
          </div>
          <div class="card-body">
            <div style="margin-bottom: 12px;">
              <strong style="color: var(--primary);">Primary Diagnosis:</strong>
              <p style="margin: 4px 0 0; font-size: 14px;">${rec.diagnosis}</p>
            </div>
            ${rec.vital_signs ? `
              <div style="background: var(--surface-alt); padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 12px; font-size: 13px;">
                <strong>Telemetry Recorded:</strong> ${rec.vital_signs}
              </div>
            ` : ''}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <strong style="font-size: 13px; color: var(--text-muted);">Doctor Clinical Notes:</strong>
                <p style="font-size: 13px; margin: 4px 0 0;">${rec.treatment_notes || 'Patient reviewed and stabilized.'}</p>
              </div>
              <div>
                <strong style="font-size: 13px; color: var(--text-muted);">Digital Prescription:</strong>
                <p style="font-size: 13px; margin: 4px 0 0; font-family: monospace;">${rec.prescription_details || 'Oral medications prescribed as per chart.'}</p>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      showToast('Could not load EHR records: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // VIEW: BILLING & INVOICING
  // =========================================================================
  async function renderBillingView() {
    try {
      const res = await api.getBillingInvoices();
      state.billing = res.data || [];
      const tbody = document.getElementById('billing-tbody');
      if (!tbody) return;

      if (!state.billing.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="bi bi-credit-card"></i><p>No billing invoices generated.</p></td></tr>';
        return;
      }

      tbody.innerHTML = state.billing.map(inv => `
        <tr>
          <td><strong>${inv.invoice_number}</strong></td>
          <td>${inv.patient_name}</td>
          <td>${inv.invoice_date}</td>
          <td><strong>₹${parseFloat(inv.net_amount).toFixed(2)}</strong></td>
          <td>₹${parseFloat(inv.discount_amount || 0).toFixed(2)}</td>
          <td><span class="badge-status ${inv.payment_status.toLowerCase()}">${inv.payment_status}</span></td>
          <td>
            ${inv.payment_status === 'Paid' ? `
              <span class="text-success" style="font-size: 12px; font-weight: 600;"><i class="bi bi-check-all"></i> Settled (${inv.payment_method || 'UPI'})</span>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="window.openPaymentModal(${inv.id}, ${inv.net_amount})">
                <i class="bi bi-credit-card-2-front"></i> Pay Invoice
              </button>
            `}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Could not load billing ledger: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // MODALS & EVENT HANDLERS
  // =========================================================================
  function setupModals() {
    // Universal Close Buttons
    document.querySelectorAll('.modal-close, .modal-close-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });

    // Patient Intake Form
    const patientForm = document.getElementById('form-register-patient');
    if (patientForm) {
      patientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById('patient-name').value,
          dob: document.getElementById('patient-dob').value,
          gender: document.getElementById('patient-gender').value,
          blood_group: document.getElementById('patient-blood-group').value,
          phone: document.getElementById('patient-phone').value,
          email: document.getElementById('patient-email').value,
          address: document.getElementById('patient-address').value,
          city: document.getElementById('patient-city').value,
          emergency_contact_name: document.getElementById('patient-emergency-name').value,
          emergency_contact_phone: document.getElementById('patient-emergency-phone').value,
          known_allergies: document.getElementById('patient-allergies').value,
          insurance_provider: document.getElementById('patient-insurance').value
        };

        try {
          const res = await api.createPatient(payload);
          showToast(res.message || 'Patient registered successfully!', 'success');
          document.getElementById('modal-register-patient').classList.remove('active');
          patientForm.reset();
          renderPatientsView();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Appointment Booking Form
    const aptForm = document.getElementById('form-book-appointment');
    if (aptForm) {
      aptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          patient_id: document.getElementById('apt-patient-select').value,
          doctor_id: document.getElementById('apt-doctor-select').value,
          department_id: document.getElementById('apt-department-select').value,
          appointment_date: document.getElementById('apt-date').value,
          appointment_time: document.getElementById('apt-time').value,
          reason: document.getElementById('apt-reason').value
        };

        try {
          const res = await api.bookAppointment(payload);
          showToast(res.message || 'Appointment confirmed!', 'success');
          document.getElementById('modal-book-appointment').classList.remove('active');
          aptForm.reset();
          renderAppointmentsView();
          renderOverviewView();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Manage Bed Form
    const bedForm = document.getElementById('form-manage-bed');
    if (bedForm) {
      bedForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bedId = document.getElementById('manage-bed-id').value;
        const status = document.getElementById('bed-modal-status').value;
        const patientId = document.getElementById('bed-patient-select').value || null;

        try {
          await api.updateBed(bedId, { status, patient_id: patientId });
          showToast(`Bed updated to ${status}.`, 'success');
          document.getElementById('modal-allocate-bed').classList.remove('active');
          renderWardsView();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Record Vitals Form
    const vitalsForm = document.getElementById('form-record-vitals');
    if (vitalsForm) {
      vitalsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          patient_id: document.getElementById('vitals-patient-select').value,
          blood_pressure: document.getElementById('vitals-bp').value,
          heart_rate_bpm: document.getElementById('vitals-hr').value,
          spo2_percentage: document.getElementById('vitals-spo2').value,
          temperature_f: document.getElementById('vitals-temp').value,
          respiratory_rate: document.getElementById('vitals-resp').value || null,
          blood_glucose_mg_dl: document.getElementById('vitals-glucose').value || null,
          nurse_notes: document.getElementById('vitals-notes').value || ''
        };

        try {
          await api.recordVitals(payload);
          showToast('Vitals telemetry log successfully saved.', 'success');
          vitalsForm.reset();
          renderNursesView();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Create Lab Order Form
    const labOrderForm = document.getElementById('form-lab-order');
    if (labOrderForm) {
      labOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          patient_id: document.getElementById('lab-order-patient-select').value,
          test_id: document.getElementById('lab-order-test-select').value,
          doctor_id: document.getElementById('lab-order-doctor-select').value
        };

        try {
          await api.createLabOrder(payload);
          showToast('Lab order issued successfully.', 'success');
          document.getElementById('modal-lab-order').classList.remove('active');
          renderLaboratoryView();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Submit Lab Result Form
    const labResultForm = document.getElementById('form-lab-result');
    if (labResultForm) {
      labResultForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderId = document.getElementById('lab-result-order-id').value;
        const payload = {
          status: document.getElementById('lab-result-status').value,
          result_summary: document.getElementById('lab-result-text').value
        };

        try {
          await api.updateLabOrder(orderId, payload);
          showToast('Laboratory workorder updated and signed.', 'success');
          document.getElementById('modal-lab-result').classList.remove('active');
          renderLaboratoryView();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Dispense Medicine Form
    const dispenseForm = document.getElementById('form-dispense-med');
    if (dispenseForm) {
      dispenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          patient_id: document.getElementById('dispense-patient-select').value,
          medicine_id: document.getElementById('dispense-medicine-select').value,
          quantity: parseInt(document.getElementById('dispense-quantity').value, 10),
          instructions: document.getElementById('dispense-instructions').value
        };

        try {
          const res = await api.dispenseMedicine(payload);
          showToast(res.message || 'Medicine dispensed and stock updated.', 'success');
          document.getElementById('modal-dispense-med').classList.remove('active');
          renderPharmacyView();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Settle Payment Form
    const paymentForm = document.getElementById('form-settle-payment');
    if (paymentForm) {
      paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const billId = document.getElementById('pay-billing-id').value;
        const amount = document.getElementById('pay-amount').value;
        const method = document.getElementById('pay-method').value;

        try {
          const res = await api.recordPayment(billId, { payment_method: method, amount_paid: amount });
          showToast(res.message || 'Payment received and invoice closed.', 'success');
          document.getElementById('modal-settle-payment').classList.remove('active');
          renderBillingView();
          renderOverviewView();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Live search for Patients
    const patientSearch = document.getElementById('patient-search-input');
    if (patientSearch) {
      let debounce;
      patientSearch.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => renderPatientsView(patientSearch.value), 300);
      });
    }

    // Live search for Pharmacy
    const pharmSearch = document.getElementById('pharmacy-search-input');
    if (pharmSearch) {
      let debounce;
      pharmSearch.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => renderPharmacyView(pharmSearch.value), 300);
      });
    }
  }

  // =========================================================================
  // CLINICAL AI ASSISTANT WIDGET
  // =========================================================================
  function setupAiChat() {
    const aiForm = document.getElementById('form-ai-chat');
    if (aiForm) {
      aiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('ai-chat-input');
        const msg = input.value.trim();
        if (!msg) return;

        input.value = '';
        appendAiChatMessage('user', msg);

        try {
          appendAiChatMessage('assistant', '<i class="bi bi-arrow-repeat spin"></i> Analyzing clinical telemetry...');
          const res = await api.sendAiChat(msg, state.currentUser?.id || null);
          
          // Remove loading bubble
          const messagesBox = document.getElementById('ai-chat-messages');
          if (messagesBox && messagesBox.lastElementChild) {
            messagesBox.lastElementChild.remove();
          }

          appendAiChatMessage('assistant', res.reply || 'Consult with an on-duty clinician for immediate assistance.');
        } catch (err) {
          const messagesBox = document.getElementById('ai-chat-messages');
          if (messagesBox && messagesBox.lastElementChild) {
            messagesBox.lastElementChild.remove();
          }
          appendAiChatMessage('assistant', 'Sorry, I encountered an error communicating with the clinical assistant: ' + err.message);
        }
      });
    }
  }

  function appendAiChatMessage(sender, htmlContent) {
    const box = document.getElementById('ai-chat-messages');
    if (!box) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ${sender}`;
    msgDiv.innerHTML = `<div class="ai-msg-content">${htmlContent}</div>`;
    box.appendChild(msgDiv);
    box.scrollTop = box.scrollHeight;
  }

  window.toggleAiDrawer = function () {
    if (!aiDrawer) return;
    const isHidden = aiDrawer.style.display === 'none' || !aiDrawer.style.display;
    aiDrawer.style.display = isHidden ? 'flex' : 'none';
  };

  window.sendPresetAiMessage = function (text) {
    const input = document.getElementById('ai-chat-input');
    if (input) {
      input.value = text;
      const form = document.getElementById('form-ai-chat');
      if (form) form.dispatchEvent(new Event('submit'));
    }
  };

  // =========================================================================
  // GLOBAL HELPERS FOR INLINE BUTTONS
  // =========================================================================
  window.openRegisterPatientModal = function () {
    document.getElementById('modal-register-patient').classList.add('active');
  };

  window.openBookAppointmentModal = async function (preferredDoctorId = null, preferredDeptId = null) {
    const [patRes, docRes, deptRes] = await Promise.all([
      api.getPatients(),
      api.getDoctors(),
      api.getDepartments()
    ]);

    const patSel = document.getElementById('apt-patient-select');
    const docSel = document.getElementById('apt-doctor-select');
    const deptSel = document.getElementById('apt-department-select');

    if (patSel) {
      patSel.innerHTML = `<option value="">Select Patient</option>` +
        (patRes.data || []).map(p => `<option value="${p.id}">${p.name} (${p.patient_code})</option>`).join('');
    }
    if (deptSel) {
      deptSel.innerHTML = (deptRes.data || []).map(d => `<option value="${d.id}" ${d.id == preferredDeptId ? 'selected' : ''}>${d.name}</option>`).join('');
    }
    if (docSel) {
      docSel.innerHTML = (docRes.data || []).map(d => `<option value="${d.id}" ${d.id == preferredDoctorId ? 'selected' : ''}>${d.name} (${d.specialization})</option>`).join('');
    }

    const dateInput = document.getElementById('apt-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    document.getElementById('modal-book-appointment').classList.add('active');
  };

  window.updateStatus = async function (id, status) {
    try {
      await api.updateAppointmentStatus(id, status);
      showToast(`Appointment status updated to ${status}.`, 'success');
      renderAppointmentsView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.openPaymentModal = function (billingId, netAmount) {
    document.getElementById('pay-billing-id').value = billingId;
    document.getElementById('pay-amount').value = parseFloat(netAmount).toFixed(2);
    document.getElementById('pay-amount-display').textContent = `₹${parseFloat(netAmount).toFixed(2)}`;
    document.getElementById('modal-settle-payment').classList.add('active');
  };

  window.viewPatientDetails = async function (patientId) {
    try {
      const res = await api.getPatientById(patientId);
      const p = res.data;
      alert(`Patient EHR Record:\nName: ${p.name} (${p.patient_code})\nBlood Group: ${p.blood_group}\nEmergency Contact: ${p.emergency_contact_name} (${p.emergency_contact_phone})\nAllergies: ${p.known_allergies || 'None'}\nInsurance: ${p.insurance_provider || 'Self-Pay'}`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.openRoleSwitcherModal = async function () {
    try {
      const res = await api.getDemoAccounts();
      const accounts = res.accounts || [];

      const listHtml = accounts.map(acc => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--surface-alt); border-radius: var(--radius-sm); margin-bottom: 8px;">
          <div>
            <strong>${acc.name}</strong> <span class="badge-status ${acc.role}">${acc.role.toUpperCase()}</span>
            <div style="font-size: 12px; color: var(--text-muted);">${acc.designation} (${acc.email})</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.switchActiveRole('${acc.email}', '${acc.password}')">
            Switch
          </button>
        </div>
      `).join('');

      document.getElementById('role-accounts-list').innerHTML = listHtml;
      document.getElementById('modal-role-switcher').classList.add('active');
    } catch (err) {
      showToast('Could not load demo perspectives: ' + err.message, 'error');
    }
  };

  window.switchActiveRole = async function (email, password) {
    try {
      const res = await api.login(email, password);
      state.currentUser = res.user;
      renderUserMeta();
      applyRbacRules();
      showToast(`Switched active profile to ${res.user.name} (${res.user.role}).`, 'success');
      document.getElementById('modal-role-switcher').classList.remove('active');
      switchView(state.currentView);
    } catch (err) {
      showToast('Could not switch role: ' + err.message, 'error');
    }
  };
});
