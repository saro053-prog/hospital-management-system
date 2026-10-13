/**
 * Hospital Management System (HMS) - Core Frontend Application
 * Handles DOM rendering, view switching, forms, modals, and toasts.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentView: 'overview',
    currentUser: api.getUser() || { name: 'Dr. Robert Vance', role: 'admin', email: 'admin@hospital.org' },
    departments: [],
    doctors: [],
    patients: [],
    appointments: [],
    records: [],
    billing: []
  };

  // Cache DOM Elements
  const viewContainers = {
    overview: document.getElementById('view-overview'),
    patients: document.getElementById('view-patients'),
    doctors: document.getElementById('view-doctors'),
    appointments: document.getElementById('view-appointments'),
    records: document.getElementById('view-records'),
    billing: document.getElementById('view-billing')
  };

  const navItems = document.querySelectorAll('.nav-item[data-view]');
  const pageTitle = document.getElementById('current-page-title');
  const breadcrumb = document.getElementById('current-breadcrumb');
  const toastContainer = document.getElementById('toast-container');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('app-sidebar');

  // Initialize
  initApp();

  async function initApp() {
    setupNavigation();
    setupMobileSidebar();
    setupModals();
    renderUserMeta();

    // Load initial reference data
    await loadDepartments();
    await loadDoctors();
    
    // Load initial view
    switchView('overview');
  }

  // Toast notification utility
  window.showToast = function (message, type = 'info') {
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
    }, 4000);
  };

  function renderUserMeta() {
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    const avatarEl = document.getElementById('user-display-avatar');

    if (nameEl) nameEl.textContent = state.currentUser.name;
    if (roleEl) roleEl.textContent = state.currentUser.role;
    if (avatarEl) avatarEl.textContent = state.currentUser.name.charAt(0);
  }

  function setupNavigation() {
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        switchView(targetView);
        if (window.innerWidth <= 992) {
          sidebar.classList.remove('open');
        }
      });
    });
  }

  function setupMobileSidebar() {
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  }

  function switchView(viewName) {
    state.currentView = viewName;

    // Update active navigation pill
    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    // Hide all views, display targeted
    Object.keys(viewContainers).forEach(key => {
      if (viewContainers[key]) {
        viewContainers[key].style.display = key === viewName ? 'block' : 'none';
      }
    });

    // Update page headers
    const titles = {
      overview: { title: 'Executive Dashboard', crumb: 'Hospital Overview & Real-Time KPIs' },
      patients: { title: 'Patients Registry', crumb: 'Demographics, EHR & Clinical Files' },
      doctors: { title: 'Doctors & Specialties', crumb: 'Physicians Directory, Schedules & Room Allocation' },
      appointments: { title: 'Appointments & Scheduling', crumb: 'Live Outpatient Triage & Token Queue' },
      records: { title: 'Electronic Medical Records', crumb: 'Clinical Diagnoses, Vitals & Prescriptions' },
      billing: { title: 'Invoicing & Revenue Management', crumb: 'Outpatient Billing Ledger & Payment Settlement' }
    };

    if (pageTitle) pageTitle.textContent = titles[viewName]?.title || 'Dashboard';
    if (breadcrumb) breadcrumb.textContent = titles[viewName]?.crumb || 'Hospital Overview';

    // Fetch view specific data
    if (viewName === 'overview') renderOverviewView();
    if (viewName === 'patients') renderPatientsView();
    if (viewName === 'doctors') renderDoctorsView();
    if (viewName === 'appointments') renderAppointmentsView();
    if (viewName === 'records') renderRecordsView();
    if (viewName === 'billing') renderBillingView();
  }

  // =========================================================================
  // VIEW: OVERVIEW / DASHBOARD
  // =========================================================================
  async function renderOverviewView() {
    try {
      const statsRes = await api.getDashboardStats();
      const stats = statsRes.stats || {};

      document.getElementById('stat-total-patients').textContent = stats.total_patients || 0;
      document.getElementById('stat-appointments-today').textContent = stats.appointments_today || 0;
      document.getElementById('stat-active-doctors').textContent = stats.active_doctors || 0;
      document.getElementById('stat-revenue').textContent = `₹${parseFloat(stats.total_revenue_inr || 0).toLocaleString()}`;

      // Load today's appointments table
      const aptRes = await api.getAppointments();
      const appointments = aptRes.data || [];
      const tbody = document.getElementById('overview-appointments-tbody');

      if (!appointments.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="bi bi-calendar-x"></i><p>No appointments recorded today.</p></td></tr>`;
        return;
      }

      tbody.innerHTML = appointments.slice(0, 5).map(apt => `
        <tr>
          <td><strong>${apt.appointment_number}</strong></td>
          <td>${apt.patient_name || 'Patient #' + apt.patient_id}</td>
          <td>${apt.doctor_name || 'Dr. Assigned'}</td>
          <td><span class="dept-pill">${apt.department_name || 'General'}</span></td>
          <td>${apt.appointment_time || '10:00 AM'} (Token #${apt.token_number || 1})</td>
          <td><span class="badge-status ${apt.status.toLowerCase()}">${apt.status}</span></td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Failed to load dashboard metrics: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // VIEW: PATIENTS
  // =========================================================================
  async function renderPatientsView(searchQuery = '') {
    try {
      const res = await api.getPatients(searchQuery);
      state.patients = res.data || [];
      const tbody = document.getElementById('patients-tbody');

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
          <td>${p.city}</td>
          <td><small>${p.insurance_provider || 'Self-Pay'}</small></td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="window.viewPatientDetails(${p.id})">
              <i class="bi bi-file-earmark-medical"></i> Clinical EHR
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Error loading patients list: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // VIEW: DOCTORS
  // =========================================================================
  async function renderDoctorsView(selectedDept = null) {
    try {
      const res = await api.getDoctors(selectedDept);
      state.doctors = res.data || [];
      const grid = document.getElementById('doctors-grid');

      if (!state.doctors.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><i class="bi bi-hospital"></i><p>No doctors listed for this specialty.</p></div>`;
        return;
      }

      grid.innerHTML = state.doctors.map(doc => `
        <div class="doctor-card">
          <div>
            <div class="doctor-badge-row">
              <span class="dept-pill">${doc.department_name || 'Specialty'}</span>
              <span class="badge-status ${doc.is_available ? 'completed' : 'cancelled'}">
                ${doc.is_available ? 'Available' : 'On Leave'}
              </span>
            </div>
            <div class="doctor-name">${doc.name}</div>
            <div class="doctor-specialty">${doc.specialization}</div>
            <div style="font-size: 12px; color: var(--text-light);">${doc.qualification}</div>
            
            <div class="doctor-meta-list">
              <div><i class="bi bi-geo-alt"></i> Room: <strong>${doc.room_number || 'Room 101'}</strong></div>
              <div><i class="bi bi-calendar-week"></i> Schedule: ${doc.availability_days || 'Mon-Fri'}</div>
              <div><i class="bi bi-cash-stack"></i> Consultation: <strong>₹${parseFloat(doc.consultation_fee).toFixed(2)}</strong></div>
            </div>
          </div>

          <button class="btn btn-primary btn-sm" style="width: 100%; margin-top: 12px;" onclick="window.openBookAppointmentModal(${doc.id}, ${doc.department_id})">
            <i class="bi bi-calendar-plus"></i> Book Consultation
          </button>
        </div>
      `).join('');
    } catch (err) {
      showToast('Error loading physicians: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // VIEW: APPOINTMENTS
  // =========================================================================
  async function renderAppointmentsView(statusFilter = '') {
    try {
      const res = await api.getAppointments(statusFilter);
      state.appointments = res.data || [];
      const tbody = document.getElementById('appointments-tbody');

      if (!state.appointments.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="bi bi-calendar-x"></i><p>No appointments match the filter.</p></td></tr>`;
        return;
      }

      tbody.innerHTML = state.appointments.map(apt => `
        <tr>
          <td><strong>${apt.appointment_number}</strong></td>
          <td>
            <div style="font-weight: 600;">${apt.patient_name || 'Patient'}</div>
            <small style="color: var(--text-muted);">${apt.patient_code || ''} ${apt.patient_phone || ''}</small>
          </td>
          <td>
            <div>${apt.doctor_name || 'Dr. Assigned'}</div>
            <span class="dept-pill">${apt.department_name || 'General'}</span>
          </td>
          <td>
            <div>${apt.appointment_date}</div>
            <small style="color: var(--text-muted);">${apt.appointment_time} (Token #${apt.token_number})</small>
          </td>
          <td><small>${apt.reason}</small></td>
          <td><span class="badge-status ${apt.status.toLowerCase()}">${apt.status}</span></td>
          <td>
            ${apt.status === 'Scheduled' ? `
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-primary btn-sm" title="Mark Completed" onclick="window.updateStatus(${apt.id}, 'Completed')">
                  <i class="bi bi-check2"></i> Complete
                </button>
                <button class="btn btn-outline btn-sm" title="Cancel" onclick="window.updateStatus(${apt.id}, 'Cancelled')">
                  <i class="bi bi-x"></i>
                </button>
              </div>
            ` : `<span style="font-size: 12px; color: var(--text-light); font-weight: 500;">Closed</span>`}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Error loading appointments: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // VIEW: MEDICAL RECORDS (EHR)
  // =========================================================================
  async function renderRecordsView() {
    try {
      const res = await api.getMedicalRecords();
      state.records = res.data || [];
      const container = document.getElementById('records-list-container');

      if (!state.records.length) {
        container.innerHTML = `<div class="empty-state"><i class="bi bi-journal-medical"></i><p>No EHR clinical records registered.</p></div>`;
        return;
      }

      container.innerHTML = state.records.map(rec => `
        <div class="card-box" style="margin-bottom: 20px;">
          <div class="card-header-flex">
            <div>
              <h3 style="color: var(--primary-dark); font-size: 16px;">
                <i class="bi bi-file-earmark-medical"></i> Diagnosis: ${rec.diagnosis}
              </h3>
              <div class="card-subtitle">
                Patient: <strong>${rec.patient_name}</strong> (${rec.patient_code}) | Attending: <strong>${rec.doctor_name}</strong> | Recorded: ${new Date(rec.recorded_at).toLocaleDateString()}
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="window.addPrescriptionModal(${rec.id}, ${rec.patient_id}, ${rec.doctor_id})">
              <i class="bi bi-plus-circle"></i> Add Prescription
            </button>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 18px; background: var(--surface-alt); padding: 12px; border-radius: var(--radius-sm);">
              <div><small style="color: var(--text-muted);">Blood Pressure</small><div style="font-weight: 700;">${rec.blood_pressure || '120/80'}</div></div>
              <div><small style="color: var(--text-muted);">Heart Rate</small><div style="font-weight: 700;">${rec.heart_rate_bpm || 72} bpm</div></div>
              <div><small style="color: var(--text-muted);">Body Temp</small><div style="font-weight: 700;">${rec.temperature_f || 98.6} °F</div></div>
              <div><small style="color: var(--text-muted);">Weight</small><div style="font-weight: 700;">${rec.weight_kg || 70} kg</div></div>
            </div>

            <div style="margin-bottom: 14px;">
              <strong style="font-size: 13px;">Clinical Symptoms:</strong>
              <p style="font-size: 13px; color: var(--text-main); margin-top: 2px;">${rec.symptoms}</p>
            </div>

            <div>
              <strong style="font-size: 13px;">Examination Notes:</strong>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">${rec.examination_notes || 'No adverse clinical remarks.'}</p>
            </div>

            ${rec.prescriptions && rec.prescriptions.length ? `
              <div style="margin-top: 16px; border-top: 1px solid var(--border); padding-top: 14px;">
                <strong style="font-size: 13px; color: var(--secondary);"><i class="bi bi-capsule"></i> Prescribed Medications:</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px;">
                  ${rec.prescriptions.map(rx => `
                    <div style="background: var(--secondary-light); color: var(--secondary-hover); padding: 6px 12px; border-radius: var(--radius-sm); font-size: 12px;">
                      <strong>${rx.medicine_name}</strong> - ${rx.dosage} (${rx.frequency}) for ${rx.duration}
                      <div style="font-size: 11px; opacity: 0.85;">${rx.instructions || ''}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('');
    } catch (err) {
      showToast('Error loading clinical records: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // VIEW: BILLING & INVOICES
  // =========================================================================
  async function renderBillingView() {
    try {
      const res = await api.getBillingInvoices();
      state.billing = res.data || [];
      const tbody = document.getElementById('billing-tbody');

      if (!state.billing.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="bi bi-receipt"></i><p>No billing invoices recorded.</p></td></tr>`;
        return;
      }

      tbody.innerHTML = state.billing.map(bill => `
        <tr>
          <td><strong>${bill.invoice_number}</strong></td>
          <td>
            <div style="font-weight: 600;">${bill.patient_name || 'Patient'}</div>
            <small style="color: var(--text-muted);">${bill.patient_code || ''}</small>
          </td>
          <td>${bill.invoice_date}</td>
          <td><strong style="font-size: 15px;">₹${parseFloat(bill.net_amount).toFixed(2)}</strong></td>
          <td><small style="color: var(--text-muted);">₹${parseFloat(bill.discount_amount || 0).toFixed(2)}</small></td>
          <td><span class="badge-status ${bill.payment_status.toLowerCase()}">${bill.payment_status}</span></td>
          <td>
            ${bill.payment_status === 'Unpaid' ? `
              <button class="btn btn-primary btn-sm" onclick="window.openPaymentModal(${bill.id}, ${bill.net_amount})">
                <i class="bi bi-credit-card"></i> Pay Now
              </button>
            ` : `
              <span style="font-size: 12px; color: var(--success); font-weight: 600;">
                <i class="bi bi-check-circle-fill"></i> Settled
              </span>
            `}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast('Error loading billing ledger: ' + err.message, 'error');
    }
  }

  // Load reference departments & doctors
  async function loadDepartments() {
    try {
      const res = await api.getDepartments();
      state.departments = res.data || [];

      // Populate department filter pills & select dropdowns
      const filterWrap = document.getElementById('dept-filter-pills');
      if (filterWrap) {
        filterWrap.innerHTML = `
          <button class="btn btn-primary btn-sm active" data-dept="">All Specialties</button>
          ${state.departments.map(d => `<button class="btn btn-outline btn-sm" data-dept="${d.id}">${d.name}</button>`).join('')}
        `;

        filterWrap.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('click', () => {
            filterWrap.querySelectorAll('button').forEach(b => {
              b.classList.remove('btn-primary', 'active');
              b.classList.add('btn-outline');
            });
            btn.classList.add('btn-primary', 'active');
            btn.classList.remove('btn-outline');
            renderDoctorsView(btn.getAttribute('data-dept'));
          });
        });
      }

      const selectDept = document.getElementById('apt-department-select');
      if (selectDept) {
        selectDept.innerHTML = `<option value="">Select Department</option>` +
          state.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
      }
    } catch (err) {
      console.warn('Could not load departments:', err);
    }
  }

  async function loadDoctors() {
    try {
      const res = await api.getDoctors();
      state.doctors = res.data || [];

      const selectDoc = document.getElementById('apt-doctor-select');
      if (selectDoc) {
        selectDoc.innerHTML = `<option value="">Select Attending Doctor</option>` +
          state.doctors.map(d => `<option value="${d.id}">${d.name} (${d.specialization})</option>`).join('');
      }
    } catch (err) {
      console.warn('Could not load doctors:', err);
    }
  }

  // =========================================================================
  // MODALS & FORMS HANDLING
  // =========================================================================
  function setupModals() {
    // Generic close modal logic
    document.querySelectorAll('.modal-close, .modal-close-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });

    // Close on overlay background click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });

    // Register Patient Form
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
          showToast(res.message, 'success');
          document.getElementById('modal-register-patient').classList.remove('active');
          patientForm.reset();
          renderPatientsView();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Schedule Appointment Form
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
          showToast(res.message, 'success');
          document.getElementById('modal-book-appointment').classList.remove('active');
          aptForm.reset();
          renderAppointmentsView();
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
          showToast(res.message, 'success');
          document.getElementById('modal-settle-payment').classList.remove('active');
          renderBillingView();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Patient Search handler
    const patientSearch = document.getElementById('patient-search-input');
    if (patientSearch) {
      let debounceTimer;
      patientSearch.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          renderPatientsView(patientSearch.value);
        }, 300);
      });
    }
  }

  // Global window functions for modal triggers from data tables
  window.openRegisterPatientModal = function () {
    document.getElementById('modal-register-patient').classList.add('active');
  };

  window.openBookAppointmentModal = async function (preferredDoctorId = null, preferredDeptId = null) {
    // Populate patient select dropdown
    const res = await api.getPatients();
    const select = document.getElementById('apt-patient-select');
    if (select) {
      select.innerHTML = `<option value="">Select Patient</option>` +
        (res.data || []).map(p => `<option value="${p.id}">${p.name} (${p.patient_code})</option>`).join('');
    }

    if (preferredDoctorId) {
      const docSelect = document.getElementById('apt-doctor-select');
      if (docSelect) docSelect.value = preferredDoctorId;
    }

    if (preferredDeptId) {
      const deptSelect = document.getElementById('apt-department-select');
      if (deptSelect) deptSelect.value = preferredDeptId;
    }

    // Set today's date default
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
      alert(`Patient EHR Record:\nName: ${p.name} (${p.patient_code})\nBlood Group: ${p.blood_group}\nEmergency Contact: ${p.emergency_contact_name} (${p.emergency_contact_phone})\nAllergies: ${p.known_allergies}\nInsurance: ${p.insurance_provider}`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Quick Role Switcher modal trigger
  window.openRoleSwitcherModal = async function () {
    const res = await api.getDemoAccounts();
    const accounts = res.accounts || [];

    const listHtml = accounts.map(acc => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--surface-alt); border-radius: var(--radius-sm); margin-bottom: 8px;">
        <div>
          <strong>${acc.name}</strong> <span class="badge-status scheduled">${acc.role}</span>
          <div style="font-size: 12px; color: var(--text-muted);">${acc.email}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="window.switchActiveRole('${acc.email}', '${acc.defaultPassword}')">
          Switch to ${acc.role}
        </button>
      </div>
    `).join('');

    document.getElementById('role-accounts-list').innerHTML = listHtml;
    document.getElementById('modal-role-switcher').classList.add('active');
  };

  window.switchActiveRole = async function (email, password) {
    try {
      const res = await api.login(email, password);
      state.currentUser = res.user;
      renderUserMeta();
      showToast(`Switched active profile to ${res.user.name} (${res.user.role}).`, 'success');
      document.getElementById('modal-role-switcher').classList.remove('active');
      switchView(state.currentView);
    } catch (err) {
      showToast('Could not switch role: ' + err.message, 'error');
    }
  };
});
