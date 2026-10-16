/**
 * Hospital Management System - REST API Client
 * Manages HTTP communication, JWT authentication headers, and domain endpoints.
 */

const API_BASE = '/api';

const api = {
  getToken() {
    return localStorage.getItem('hms_auth_token');
  },

  setToken(token) {
    if (token) localStorage.setItem('hms_auth_token', token);
    else localStorage.removeItem('hms_auth_token');
  },

  getUser() {
    try {
      const stored = localStorage.getItem('hms_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) localStorage.setItem('hms_auth_user', JSON.stringify(user));
    else localStorage.removeItem('hms_auth_user');
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        // If 401 Unauthorized, token might be invalid or expired
        if (response.status === 401 && !endpoint.startsWith('/auth/login')) {
          this.logout();
          window.dispatchEvent(new CustomEvent('hms_unauthorized'));
        }
        throw new Error(data.message || `HTTP ${response.status}: Request failed.`);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  // =========================================================================
  // AUTHENTICATION & SESSION
  // =========================================================================
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token) {
      this.setToken(res.token);
      this.setUser(res.user);
    }
    return res;
  },

  async register(payload) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(token, newPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword })
    });
  },

  async getMe() {
    return this.request('/auth/me');
  },

  async getDemoAccounts() {
    return this.request('/auth/demo-accounts');
  },

  logout() {
    this.setToken(null);
    this.setUser(null);
  },

  // =========================================================================
  // STATS & DASHBOARD
  // =========================================================================
  async getDashboardStats() {
    return this.request('/stats/dashboard');
  },

  // =========================================================================
  // PATIENTS
  // =========================================================================
  async getPatients(search = '') {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/patients${q}`);
  },

  async getPatientById(id) {
    return this.request(`/patients/${id}`);
  },

  async createPatient(payload) {
    return this.request('/patients', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // =========================================================================
  // DOCTORS & DEPARTMENTS
  // =========================================================================
  async getDoctors(deptId = null) {
    const q = deptId ? `?department_id=${deptId}` : '';
    return this.request(`/doctors${q}`);
  },

  async getDepartments() {
    return this.request('/doctors/departments');
  },

  // =========================================================================
  // APPOINTMENTS
  // =========================================================================
  async getAppointments(status = '', date = '') {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (date) params.append('date', date);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/appointments${q}`);
  },

  async bookAppointment(payload) {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateAppointmentStatus(id, status) {
    return this.request(`/appointments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // =========================================================================
  // WARDS & BED MANAGEMENT
  // =========================================================================
  async getWards() {
    return this.request('/wards');
  },

  async getBeds(wardId = null, status = '') {
    const params = new URLSearchParams();
    if (wardId) params.append('ward_id', wardId);
    if (status) params.append('status', status);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/wards/beds${q}`);
  },

  async updateBed(bedId, payload) {
    return this.request(`/wards/beds/${bedId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // =========================================================================
  // NURSES & VITALS TELEMETRY
  // =========================================================================
  async getNurses() {
    return this.request('/nurses');
  },

  async getNurseDuty() {
    return this.request('/nurses/duty');
  },

  async getNurseVitals(patientId = null) {
    const q = patientId ? `?patient_id=${patientId}` : '';
    return this.request(`/nurses/vitals${q}`);
  },

  async recordVitals(payload) {
    return this.request('/nurses/vitals', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // =========================================================================
  // LABORATORY & DIAGNOSTICS
  // =========================================================================
  async getLabTests() {
    return this.request('/laboratory/tests');
  },

  async getLabOrders(status = '') {
    const q = status ? `?status=${status}` : '';
    return this.request(`/laboratory/orders${q}`);
  },

  async createLabOrder(payload) {
    return this.request('/laboratory/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateLabOrder(id, payload) {
    return this.request(`/laboratory/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // =========================================================================
  // PHARMACY & DISPENSING
  // =========================================================================
  async getMedicines(search = '') {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/pharmacy/medicines${q}`);
  },

  async addMedicine(payload) {
    return this.request('/pharmacy/medicines', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async dispenseMedicine(payload) {
    return this.request('/pharmacy/dispense', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // =========================================================================
  // MEDICAL RECORDS (EHR)
  // =========================================================================
  async getMedicalRecords(patientId = null) {
    const q = patientId ? `?patient_id=${patientId}` : '';
    return this.request(`/records${q}`);
  },

  async createMedicalRecord(payload) {
    return this.request('/records', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // =========================================================================
  // BILLING & INVOICING
  // =========================================================================
  async getBillingInvoices(status = '') {
    const q = status ? `?status=${status}` : '';
    return this.request(`/billing${q}`);
  },

  async createInvoice(payload) {
    return this.request('/billing', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async recordPayment(id, payload) {
    return this.request(`/billing/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================
  async getNotifications() {
    return this.request('/notifications');
  },

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  },

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'PUT' });
  },

  // =========================================================================
  // AI CLINICAL ASSISTANT
  // =========================================================================
  async sendAiChat(message, patientId = null) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, patient_id: patientId })
    });
  }
};
