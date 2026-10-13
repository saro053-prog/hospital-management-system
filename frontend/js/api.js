/**
 * Hospital Management System - REST API Client
 * Manages HTTP communication, JWT headers, and resource endpoints
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
      return JSON.parse(localStorage.getItem('hms_auth_user') || 'null');
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
        throw new Error(data.message || `HTTP ${response.status}: Request failed.`);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth endpoints
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

  // Stats
  async getDashboardStats() {
    return this.request('/stats/dashboard');
  },

  // Patients
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

  // Doctors & Departments
  async getDoctors(deptId = null) {
    const q = deptId ? `?department_id=${deptId}` : '';
    return this.request(`/doctors${q}`);
  },

  async getDepartments() {
    return this.request('/doctors/departments');
  },

  // Appointments
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

  // Medical Records (EHR)
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

  // Billing
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
  }
};
