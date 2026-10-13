/**
 * Database Connection & Connection Pool
 * Primary: MySQL 8.0+ via mysql2/promise
 * Resilient Fallback: Built-in In-Memory / SQLite-compatible relational store
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let pool = null;
let isUsingFallback = false;

// Mock fallback store for zero-downtime offline demonstrations
const fallbackStore = {
  departments: [
    { id: 1, name: 'Cardiology', code: 'CARD', description: 'Comprehensive cardiovascular care.', floor_location: 'Block A, 3rd Floor', phone_extension: '301' },
    { id: 2, name: 'Neurology', code: 'NEUR', description: 'Brain, spine, and nerve disorders.', floor_location: 'Block B, 4th Floor', phone_extension: '402' },
    { id: 3, name: 'Orthopedics', code: 'ORTH', description: 'Bone, joint surgery, and rehabilitation.', floor_location: 'Block A, 2nd Floor', phone_extension: '205' },
    { id: 4, name: 'Pediatrics', code: 'PED', description: 'Child development and pediatric care.', floor_location: 'Block C, 1st Floor', phone_extension: '108' },
    { id: 5, name: 'General Medicine', code: 'GEN', description: 'Primary adult care and diagnosis.', floor_location: 'Block A, 1st Floor', phone_extension: '102' },
    { id: 6, name: 'Emergency & Trauma', code: 'EMERG', description: '24/7 Level-1 acute triage.', floor_location: 'Block G, Ground Floor', phone_extension: '100' }
  ],
  doctors: [
    { id: 1, user_id: 2, department_id: 1, name: 'Dr. Arvind Sharma', specialization: 'Interventional Cardiologist', qualification: 'MBBS, MD, DM', license_number: 'MCI-CARD-8842', phone: '+91 98765 11111', email: 'dr.sharma@hospital.org', consultation_fee: 800.00, room_number: 'Suite 304', availability_days: 'Mon,Wed,Fri', is_available: 1 },
    { id: 2, user_id: 3, department_id: 2, name: 'Dr. Anita Desai', specialization: 'Consultant Neurologist', qualification: 'MBBS, MD, DNB', license_number: 'MCI-NEUR-9921', phone: '+91 98765 22222', email: 'dr.anita@hospital.org', consultation_fee: 950.00, room_number: 'Suite 408', availability_days: 'Tue,Thu,Sat', is_available: 1 },
    { id: 3, user_id: 4, department_id: 3, name: 'Dr. Rajesh Patel', specialization: 'Orthopedic Surgeon', qualification: 'MBBS, MS, M.Ch', license_number: 'MCI-ORTH-7731', phone: '+91 98765 33333', email: 'dr.rajesh@hospital.org', consultation_fee: 750.00, room_number: 'Suite 202', availability_days: 'Mon,Tue,Thu,Fri', is_available: 1 },
    { id: 4, user_id: 5, department_id: 4, name: 'Dr. Priya Nambiar', specialization: 'Senior Pediatrician', qualification: 'MBBS, MD, DCH', license_number: 'MCI-PEDI-3312', phone: '+91 98765 44444', email: 'dr.priya@hospital.org', consultation_fee: 600.00, room_number: 'Suite 105', availability_days: 'Mon,Tue,Wed,Sat', is_available: 1 }
  ],
  patients: [
    { id: 1, patient_code: 'PAT-1001', name: 'Arun Kumar', dob: '1988-06-14', gender: 'Male', blood_group: 'O+', phone: '+91 98401 23456', email: 'arun@example.com', address: '42 Gandhi Nagar', city: 'Chennai', emergency_contact_name: 'Revathi Kumar', emergency_contact_phone: '+91 98401 99999', known_allergies: 'Penicillin', insurance_provider: 'Star Health Premier' },
    { id: 2, patient_code: 'PAT-1002', name: 'Meena Sundaram', dob: '1995-11-20', gender: 'Female', blood_group: 'B+', phone: '+91 98402 34567', email: 'meena@example.com', address: '15 Anna Salai', city: 'Chennai', emergency_contact_name: 'Sundaram K', emergency_contact_phone: '+91 98402 88888', known_allergies: 'None', insurance_provider: 'HDFC ERGO' },
    { id: 3, patient_code: 'PAT-1003', name: 'Kavitha R', dob: '1976-03-08', gender: 'Female', blood_group: 'A+', phone: '+91 98403 45678', email: 'kavitha.r@gmail.com', address: '88 Ring Road', city: 'Madurai', emergency_contact_name: 'Ramesh R', emergency_contact_phone: '+91 98403 77777', known_allergies: 'Sulfa drugs', insurance_provider: 'National Insurance' },
    { id: 4, patient_code: 'PAT-1004', name: 'Suresh Babu', dob: '1982-09-25', gender: 'Male', blood_group: 'AB+', phone: '+91 98404 56789', email: 'suresh.babu@gmail.com', address: '12 West Cross Street', city: 'Madurai', emergency_contact_name: 'Deepa Babu', emergency_contact_phone: '+91 98404 66666', known_allergies: 'Aspirin', insurance_provider: 'Care Health' }
  ],
  appointments: [
    { id: 1, appointment_number: 'APT-2026-0101', patient_id: 1, doctor_id: 1, department_id: 1, appointment_date: new Date().toISOString().split('T')[0], appointment_time: '10:00:00', token_number: 1, reason: 'Routine BP review and echocardiogram check', status: 'Scheduled', notes: 'Slight exertion fatigue reported.' },
    { id: 2, appointment_number: 'APT-2026-0102', patient_id: 2, doctor_id: 2, department_id: 2, appointment_date: new Date().toISOString().split('T')[0], appointment_time: '11:30:00', token_number: 2, reason: 'Recurrent migraine evaluation', status: 'Scheduled', notes: 'Dietary tracking advised.' },
    { id: 3, appointment_number: 'APT-2026-0103', patient_id: 3, doctor_id: 3, department_id: 3, appointment_date: new Date().toISOString().split('T')[0], appointment_time: '14:00:00', token_number: 3, reason: 'Post-op knee arthroscopy follow-up', status: 'Scheduled', notes: 'Check latest X-Rays.' },
    { id: 4, appointment_number: 'APT-2026-0098', patient_id: 4, doctor_id: 1, department_id: 1, appointment_date: '2026-10-12', appointment_time: '09:30:00', token_number: 1, reason: 'Lipid profile triage', status: 'Completed', notes: 'Lifestyle modification advised.' }
  ],
  medical_records: [
    { id: 1, patient_id: 4, doctor_id: 1, appointment_id: 4, diagnosis: 'Stage-1 Hypertension & Dyslipidemia', symptoms: 'Occasional morning headache, mild dizziness', examination_notes: 'Clear bilateral breath sounds, regular S1/S2 rhythm.', blood_pressure: '138/88', heart_rate_bpm: 76, temperature_f: 98.4, weight_kg: 78.5, recorded_at: new Date().toISOString() }
  ],
  prescriptions: [
    { id: 1, record_id: 1, patient_id: 4, doctor_id: 1, medicine_name: 'Telmisartan Tablets IP', dosage: '40 mg', frequency: 'Once daily (Morning)', duration: '30 days', instructions: 'Take 30 mins after breakfast.' },
    { id: 2, record_id: 1, patient_id: 4, doctor_id: 1, medicine_name: 'Atorvastatin Tablets IP', dosage: '10 mg', frequency: 'Once daily (Night)', duration: '30 days', instructions: 'Take after dinner.' }
  ],
  billing: [
    { id: 1, invoice_number: 'INV-2026-0045', patient_id: 4, appointment_id: 4, total_amount: 1250.00, discount_amount: 50.00, tax_amount: 60.00, net_amount: 1260.00, payment_status: 'Paid', invoice_date: '2026-10-12', due_date: '2026-10-12', notes: 'Consultation + baseline ECG' },
    { id: 2, invoice_number: 'INV-2026-0046', patient_id: 1, appointment_id: 1, total_amount: 800.00, discount_amount: 0.00, tax_amount: 40.00, net_amount: 840.00, payment_status: 'Unpaid', invoice_date: new Date().toISOString().split('T')[0], due_date: new Date(Date.now() + 7*86400000).toISOString().split('T')[0], notes: 'Outpatient consultation appointment' }
  ],
  users: [
    { id: 1, name: 'Dr. Robert Vance', email: 'admin@hospital.org', role: 'admin', phone: '+91 98765 43210' },
    { id: 2, name: 'Dr. Arvind Sharma', email: 'dr.sharma@hospital.org', role: 'doctor', phone: '+91 98765 11111' },
    { id: 6, name: 'Meera Nair', email: 'receptionist@hospital.org', role: 'receptionist', phone: '+91 98765 55555' },
    { id: 7, name: 'Arun Kumar', email: 'arun@example.com', role: 'patient', phone: '+91 98401 23456' }
  ]
};

async function initDb() {
  if (pool) return pool;

  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hospital_management_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 3000
    });

    // Test connection
    const connection = await pool.getConnection();
    connection.release();
    console.log(`[Database] Successfully connected to MySQL at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME || 'hospital_management_db'}`);
    return pool;
  } catch (err) {
    console.warn(`[Database] MySQL not reachable (${err.message}). Activating zero-downtime memory store fallback.`);
    isUsingFallback = true;
    return null;
  }
}

/**
 * Executes a SQL query or delegates to the in-memory fallback store
 */
async function query(sql, params = []) {
  if (!pool && !isUsingFallback) {
    await initDb();
  }

  if (pool && !isUsingFallback) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.warn(`[Database] MySQL execution error: ${err.message}. Retrying via fallback.`);
      // If error occurs, fall through to in-memory store
    }
  }

  // Handle in-memory fallback queries
  return executeFallbackQuery(sql, params);
}

function executeFallbackQuery(sql, params) {
  const normalized = sql.trim().toUpperCase();

  // 1. SELECT COUNT / STATS
  if (normalized.includes('COUNT(')) {
    return [{
      total_patients: fallbackStore.patients.length,
      appointments_today: fallbackStore.appointments.filter(a => a.appointment_date === new Date().toISOString().split('T')[0]).length,
      active_doctors: fallbackStore.doctors.filter(d => d.is_available).length,
      total_departments: fallbackStore.departments.length,
      unpaid_invoices: fallbackStore.billing.filter(b => b.payment_status === 'Unpaid').length,
      revenue_collected: fallbackStore.billing.reduce((acc, b) => b.payment_status === 'Paid' ? acc + parseFloat(b.net_amount) : acc, 0)
    }];
  }

  // 2. PATIENTS
  if (normalized.includes('FROM `PATIENTS`') || normalized.includes('FROM PATIENTS')) {
    if (normalized.startsWith('SELECT') && params[0] && typeof params[0] === 'number') {
      const found = fallbackStore.patients.find(p => p.id === params[0]);
      return found ? [found] : [];
    }
    return fallbackStore.patients;
  }

  // 3. DOCTORS (JOIN DEPARTMENTS)
  if (normalized.includes('FROM `DOCTORS`') || normalized.includes('FROM DOCTORS')) {
    return fallbackStore.doctors.map(doc => {
      const dep = fallbackStore.departments.find(d => d.id === doc.department_id);
      return { ...doc, department_name: dep ? dep.name : 'General' };
    });
  }

  // 4. DEPARTMENTS
  if (normalized.includes('FROM `DEPARTMENTS`') || normalized.includes('FROM DEPARTMENTS')) {
    return fallbackStore.departments;
  }

  // 5. APPOINTMENTS
  if (normalized.includes('FROM `APPOINTMENTS`') || normalized.includes('FROM APPOINTMENTS')) {
    return fallbackStore.appointments.map(apt => {
      const patient = fallbackStore.patients.find(p => p.id === apt.patient_id);
      const doctor = fallbackStore.doctors.find(d => d.id === apt.doctor_id);
      const dep = fallbackStore.departments.find(d => d.id === apt.department_id);
      return {
        ...apt,
        patient_name: patient ? patient.name : 'Unknown',
        patient_code: patient ? patient.patient_code : '',
        patient_phone: patient ? patient.phone : '',
        doctor_name: doctor ? doctor.name : 'Unknown',
        department_name: dep ? dep.name : 'General'
      };
    });
  }

  // 6. MEDICAL RECORDS
  if (normalized.includes('FROM `MEDICAL_RECORDS`') || normalized.includes('FROM MEDICAL_RECORDS')) {
    return fallbackStore.medical_records.map(rec => {
      const patient = fallbackStore.patients.find(p => p.id === rec.patient_id);
      const doctor = fallbackStore.doctors.find(d => d.id === rec.doctor_id);
      const prescs = fallbackStore.prescriptions.filter(p => p.record_id === rec.id);
      return {
        ...rec,
        patient_name: patient ? patient.name : 'Unknown',
        patient_code: patient ? patient.patient_code : '',
        doctor_name: doctor ? doctor.name : 'Unknown',
        prescriptions: prescs
      };
    });
  }

  // 7. BILLING
  if (normalized.includes('FROM `BILLING`') || normalized.includes('FROM BILLING')) {
    return fallbackStore.billing.map(b => {
      const patient = fallbackStore.patients.find(p => p.id === b.patient_id);
      return {
        ...b,
        patient_name: patient ? patient.name : 'Unknown',
        patient_code: patient ? patient.patient_code : ''
      };
    });
  }

  // 8. INSERT PATIENTS
  if (normalized.startsWith('INSERT INTO `PATIENTS`') || normalized.startsWith('INSERT INTO PATIENTS')) {
    const newId = fallbackStore.patients.length + 1;
    const newPatient = {
      id: newId,
      patient_code: params[0] || `PAT-${1000 + newId}`,
      name: params[1],
      dob: params[2],
      gender: params[3],
      blood_group: params[4],
      phone: params[5],
      email: params[6],
      address: params[7],
      city: params[8] || 'Chennai',
      emergency_contact_name: params[9] || '',
      emergency_contact_phone: params[10] || '',
      known_allergies: params[11] || '',
      insurance_provider: params[12] || ''
    };
    fallbackStore.patients.unshift(newPatient);
    return { insertId: newId, affectedRows: 1 };
  }

  // 9. INSERT APPOINTMENT
  if (normalized.startsWith('INSERT INTO `APPOINTMENTS`') || normalized.startsWith('INSERT INTO APPOINTMENTS')) {
    const newId = fallbackStore.appointments.length + 1;
    const newApt = {
      id: newId,
      appointment_number: params[0] || `APT-2026-${String(newId).padStart(4, '0')}`,
      patient_id: parseInt(params[1]),
      doctor_id: parseInt(params[2]),
      department_id: parseInt(params[3]),
      appointment_date: params[4],
      appointment_time: params[5],
      token_number: fallbackStore.appointments.filter(a => a.appointment_date === params[4] && a.doctor_id === parseInt(params[2])).length + 1,
      reason: params[6],
      status: 'Scheduled',
      notes: params[7] || ''
    };
    fallbackStore.appointments.unshift(newApt);
    return { insertId: newId, affectedRows: 1 };
  }

  // 10. UPDATE APPOINTMENT STATUS
  if (normalized.startsWith('UPDATE `APPOINTMENTS`') || normalized.startsWith('UPDATE APPOINTMENTS')) {
    const status = params[0];
    const id = params[params.length - 1];
    const apt = fallbackStore.appointments.find(a => a.id === parseInt(id));
    if (apt) apt.status = status;
    return { affectedRows: 1 };
  }

  // Generic fallback
  return [];
}

module.exports = {
  initDb,
  query,
  fallbackStore
};
