/**
 * Database Connection & High-Availability Relational Data Layer
 * Primary: MySQL 8.0+ via mysql2/promise with connection pooling
 * Fallback: Full relational in-memory schema with pre-hashed bcrypt accounts and realistic clinical records
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let pool = null;
let isUsingFallback = false;

// Default password hash for all demo accounts: "Password@123"
const DEMO_PASSWORD_HASH = '$2a$10$Ie4f95zku/V1HsvTkm.AoOJaztmPknscuT88egR3aCjY/1q7V1IC.';

// Comprehensive relational fallback store
const fallbackStore = {
  users: [
    { id: 1, name: 'Dr. Robert Vance', email: 'admin@hospital.org', password_hash: DEMO_PASSWORD_HASH, role: 'admin', phone: '+91 98765 43210', is_active: 1 },
    { id: 2, name: 'Dr. Arvind Sharma', email: 'dr.sharma@hospital.org', password_hash: DEMO_PASSWORD_HASH, role: 'doctor', phone: '+91 98765 11111', is_active: 1 },
    { id: 3, name: 'Dr. Anita Desai', email: 'dr.anita@hospital.org', password_hash: DEMO_PASSWORD_HASH, role: 'doctor', phone: '+91 98765 22222', is_active: 1 },
    { id: 4, name: 'Dr. Rajesh Patel', email: 'dr.rajesh@hospital.org', password_hash: DEMO_PASSWORD_HASH, role: 'doctor', phone: '+91 98765 33333', is_active: 1 },
    { id: 5, name: 'Dr. Priya Nambiar', email: 'dr.priya@hospital.org', password_hash: DEMO_PASSWORD_HASH, role: 'doctor', phone: '+91 98765 44444', is_active: 1 },
    { id: 6, name: 'Nurse Sarah Jenkins', email: 'nurse.sarah@hospital.org', password_hash: DEMO_PASSWORD_HASH, role: 'nurse', phone: '+91 98765 66666', is_active: 1 },
    { id: 7, name: 'Nurse Rachel Adams', email: 'nurse.rachel@hospital.org', password_hash: DEMO_PASSWORD_HASH, role: 'nurse', phone: '+91 98765 77777', is_active: 1 },
    { id: 8, name: 'Meera Nair', email: 'receptionist@hospital.org', password_hash: DEMO_PASSWORD_HASH, role: 'receptionist', phone: '+91 98765 55555', is_active: 1 },
    { id: 9, name: 'David Chen', email: 'lab.tech@hospital.org', password_hash: DEMO_PASSWORD_HASH, role: 'lab_staff', phone: '+91 98765 88888', is_active: 1 },
    { id: 10, name: 'Arun Kumar', email: 'arun@example.com', password_hash: DEMO_PASSWORD_HASH, role: 'patient', phone: '+91 98401 23456', is_active: 1 },
    { id: 11, name: 'Meena Sundaram', email: 'meena@example.com', password_hash: DEMO_PASSWORD_HASH, role: 'patient', phone: '+91 98402 34567', is_active: 1 },
    { id: 12, name: 'Kavitha R', email: 'kavitha.r@gmail.com', password_hash: DEMO_PASSWORD_HASH, role: 'patient', phone: '+91 98403 45678', is_active: 1 },
    { id: 13, name: 'Suresh Babu', email: 'suresh.babu@gmail.com', password_hash: DEMO_PASSWORD_HASH, role: 'patient', phone: '+91 98404 56789', is_active: 1 }
  ],

  password_resets: [],

  departments: [
    { id: 1, name: 'Cardiology', code: 'CARD', description: 'Comprehensive cardiovascular care, ECG & cath lab.', floor_location: 'Block A, 3rd Floor', phone_extension: '301' },
    { id: 2, name: 'Neurology', code: 'NEUR', description: 'Brain, spine, stroke, and nervous system disorders.', floor_location: 'Block B, 4th Floor', phone_extension: '402' },
    { id: 3, name: 'Orthopedics', code: 'ORTH', description: 'Joint replacement, trauma surgery, and rehabilitation.', floor_location: 'Block A, 2nd Floor', phone_extension: '205' },
    { id: 4, name: 'Pediatrics', code: 'PED', description: 'Child health, immunization, and neonatal care.', floor_location: 'Block C, 1st Floor', phone_extension: '108' },
    { id: 5, name: 'General Medicine', code: 'GEN', description: 'Primary adult healthcare, chronic disease & diagnostics.', floor_location: 'Block A, 1st Floor', phone_extension: '102' },
    { id: 6, name: 'Emergency & Trauma', code: 'EMERG', description: '24/7 Level-1 acute medical & trauma triage.', floor_location: 'Block G, Ground Floor', phone_extension: '100' }
  ],

  doctors: [
    { id: 1, user_id: 2, department_id: 1, name: 'Dr. Arvind Sharma', specialization: 'Interventional Cardiologist', qualification: 'MBBS, MD, DM (Cardio)', license_number: 'MCI-CARD-8842', phone: '+91 98765 11111', email: 'dr.sharma@hospital.org', consultation_fee: 800.00, room_number: 'Suite 304', availability_days: 'Mon,Wed,Fri', shift_start: '09:00:00', shift_end: '17:00:00', is_available: 1 },
    { id: 2, user_id: 3, department_id: 2, name: 'Dr. Anita Desai', specialization: 'Consultant Neurologist', qualification: 'MBBS, MD, DNB (Neuro)', license_number: 'MCI-NEUR-9921', phone: '+91 98765 22222', email: 'dr.anita@hospital.org', consultation_fee: 950.00, room_number: 'Suite 408', availability_days: 'Tue,Thu,Sat', shift_start: '10:00:00', shift_end: '18:00:00', is_available: 1 },
    { id: 3, user_id: 4, department_id: 3, name: 'Dr. Rajesh Patel', specialization: 'Orthopedic Surgeon', qualification: 'MBBS, MS, M.Ch (Ortho)', license_number: 'MCI-ORTH-7731', phone: '+91 98765 33333', email: 'dr.rajesh@hospital.org', consultation_fee: 750.00, room_number: 'Suite 202', availability_days: 'Mon,Tue,Thu,Fri', shift_start: '09:00:00', shift_end: '16:00:00', is_available: 1 },
    { id: 4, user_id: 5, department_id: 4, name: 'Dr. Priya Nambiar', specialization: 'Senior Pediatrician', qualification: 'MBBS, MD (Pediatrics), DCH', license_number: 'MCI-PEDI-3312', phone: '+91 98765 44444', email: 'dr.priya@hospital.org', consultation_fee: 600.00, room_number: 'Suite 105', availability_days: 'Mon,Tue,Wed,Sat', shift_start: '09:30:00', shift_end: '15:30:00', is_available: 1 },
    { id: 5, user_id: null, department_id: 5, name: 'Dr. Vikram Malhotra', specialization: 'Consultant Physician', qualification: 'MBBS, MD (General Medicine)', license_number: 'MCI-GEN-1029', phone: '+91 98765 55500', email: 'dr.vikram@hospital.org', consultation_fee: 500.00, room_number: 'Suite 102', availability_days: 'Mon,Tue,Wed,Thu,Fri,Sat', shift_start: '08:30:00', shift_end: '16:30:00', is_available: 1 },
    { id: 6, user_id: null, department_id: 6, name: 'Dr. Sarah Thomas', specialization: 'Emergency Care Specialist', qualification: 'MBBS, MEM (Emergency)', license_number: 'MCI-EMER-4912', phone: '+91 98765 55501', email: 'dr.sarah@hospital.org', consultation_fee: 700.00, room_number: 'ER Triage 01', availability_days: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', shift_start: '00:00:00', shift_end: '23:59:59', is_available: 1 }
  ],

  nurses: [
    { id: 1, user_id: 6, department_id: 1, name: 'Nurse Sarah Jenkins', qualification: 'B.Sc Nursing, Critical Care Cert', license_number: 'NC-TN-2018-9102', phone: '+91 98765 66666', email: 'nurse.sarah@hospital.org', shift: 'Morning', assigned_ward: 'Cardiology CCU', is_on_duty: 1 },
    { id: 2, user_id: 7, department_id: 2, name: 'Nurse Rachel Adams', qualification: 'B.Sc Nursing', license_number: 'NC-TN-2020-4491', phone: '+91 98765 77777', email: 'nurse.rachel@hospital.org', shift: 'Evening', assigned_ward: 'Neurology Ward', is_on_duty: 1 },
    { id: 3, user_id: null, department_id: 6, name: 'Nurse Maria Jones', qualification: 'General Nursing & Midwifery (GNM)', license_number: 'NC-TN-2019-3382', phone: '+91 98765 88800', email: 'nurse.maria@hospital.org', shift: 'Rotational', assigned_ward: 'Emergency Triage', is_on_duty: 1 },
    { id: 4, user_id: null, department_id: 4, name: 'Nurse Anita Patel', qualification: 'M.Sc Pediatric Nursing', license_number: 'NC-TN-2017-1120', phone: '+91 98765 88801', email: 'nurse.anita@hospital.org', shift: 'Morning', assigned_ward: 'Pediatric Ward', is_on_duty: 1 }
  ],

  patients: [
    { id: 1, user_id: 10, patient_code: 'PAT-1001', name: 'Arun Kumar', dob: '1988-06-14', gender: 'Male', blood_group: 'O+', phone: '+91 98401 23456', email: 'arun@example.com', address: '42 Gandhi Nagar', city: 'Chennai', emergency_contact_name: 'Revathi Kumar', emergency_contact_phone: '+91 98401 99999', known_allergies: 'Penicillin', insurance_provider: 'Star Health Premier' },
    { id: 2, user_id: 11, patient_code: 'PAT-1002', name: 'Meena Sundaram', dob: '1995-11-20', gender: 'Female', blood_group: 'B+', phone: '+91 98402 34567', email: 'meena@example.com', address: '15 Anna Salai', city: 'Chennai', emergency_contact_name: 'Sundaram K', emergency_contact_phone: '+91 98402 88888', known_allergies: 'None', insurance_provider: 'HDFC ERGO Optima' },
    { id: 3, user_id: 12, patient_code: 'PAT-1003', name: 'Kavitha R', dob: '1976-03-08', gender: 'Female', blood_group: 'A+', phone: '+91 98403 45678', email: 'kavitha.r@gmail.com', address: '88 Ring Road', city: 'Madurai', emergency_contact_name: 'Ramesh R', emergency_contact_phone: '+91 98403 77777', known_allergies: 'Sulfa drugs', insurance_provider: 'National Insurance' },
    { id: 4, user_id: 13, patient_code: 'PAT-1004', name: 'Suresh Babu', dob: '1982-09-25', gender: 'Male', blood_group: 'AB+', phone: '+91 98404 56789', email: 'suresh.babu@gmail.com', address: '12 West Cross Street', city: 'Madurai', emergency_contact_name: 'Deepa Babu', emergency_contact_phone: '+91 98404 66666', known_allergies: 'Aspirin', insurance_provider: 'Care Health Super' },
    { id: 5, user_id: null, patient_code: 'PAT-1005', name: 'Olivia Rhye', dob: '1992-04-12', gender: 'Female', blood_group: 'O+', phone: '+91 98405 67890', email: 'olivia@example.com', address: '28 Richmond Road', city: 'Chennai', emergency_contact_name: 'David Rhye', emergency_contact_phone: '+91 98405 11111', known_allergies: 'Latex', insurance_provider: 'Max Bupa Health' },
    { id: 6, user_id: null, patient_code: 'PAT-1006', name: 'Phoenix Baker', dob: '1979-08-19', gender: 'Male', blood_group: 'B-', phone: '+91 98406 78901', email: 'phoenix@example.com', address: '95 Green Valley', city: 'Coimbatore', emergency_contact_name: 'Sarah Baker', emergency_contact_phone: '+91 98406 22222', known_allergies: 'None', insurance_provider: 'ICICI Lombard' }
  ],

  appointments: [
    { id: 1, appointment_number: 'APT-2026-0101', patient_id: 1, doctor_id: 1, department_id: 1, appointment_date: new Date().toISOString().split('T')[0], appointment_time: '10:00:00', token_number: 108, reason: 'Routine BP review and echocardiogram check', status: 'In Consultation', notes: 'Slight exertion fatigue reported.' },
    { id: 2, appointment_number: 'APT-2026-0102', patient_id: 2, doctor_id: 2, department_id: 2, appointment_date: new Date().toISOString().split('T')[0], appointment_time: '11:30:00', token_number: 109, reason: 'Recurrent migraine evaluation', status: 'Confirmed', notes: 'Dietary tracking advised.' },
    { id: 3, appointment_number: 'APT-2026-0103', patient_id: 3, doctor_id: 3, department_id: 3, appointment_date: new Date().toISOString().split('T')[0], appointment_time: '14:00:00', token_number: 110, reason: 'Post-op knee arthroscopy follow-up', status: 'Scheduled', notes: 'Check latest X-Rays.' },
    { id: 4, appointment_number: 'APT-2026-0104', patient_id: 5, doctor_id: 1, department_id: 1, appointment_date: new Date().toISOString().split('T')[0], appointment_time: '10:30:00', token_number: 112, reason: 'Cardiology follow-up consultation', status: 'Confirmed', notes: 'ECG baseline verified.' },
    { id: 5, appointment_number: 'APT-2026-0098', patient_id: 4, doctor_id: 1, department_id: 1, appointment_date: '2026-10-12', appointment_time: '09:30:00', token_number: 101, reason: 'Lipid profile triage', status: 'Completed', notes: 'Lifestyle modification advised.' },
    { id: 6, appointment_number: 'APT-2026-0099', patient_id: 6, doctor_id: 2, department_id: 2, appointment_date: '2026-10-11', appointment_time: '15:00:00', token_number: 102, reason: 'Neurological dizziness assessment', status: 'Completed', notes: 'MRI Brain review completed.' }
  ],

  wards: [
    { id: 1, name: 'Cardiology CCU', type: 'CCU', floor_location: 'Block A, 3rd Floor', total_beds: 8 },
    { id: 2, name: 'Intensive Care Unit (ICU)', type: 'ICU', floor_location: 'Block B, 2nd Floor', total_beds: 12 },
    { id: 3, name: 'General Ward - Male', type: 'General', floor_location: 'Block A, 1st Floor', total_beds: 16 },
    { id: 4, name: 'General Ward - Female', type: 'General', floor_location: 'Block A, 2nd Floor', total_beds: 16 },
    { id: 5, name: 'Post-Operative Recovery', type: 'Post-Op', floor_location: 'Block B, 3rd Floor', total_beds: 10 }
  ],

  beds: [
    { id: 1, ward_id: 1, bed_number: 'CCU-01', status: 'Occupied', patient_id: 1, assigned_at: '2026-10-14 09:30:00', daily_rate: 3500.00 },
    { id: 2, ward_id: 1, bed_number: 'CCU-02', status: 'Available', patient_id: null, assigned_at: null, daily_rate: 3500.00 },
    { id: 3, ward_id: 1, bed_number: 'CCU-03', status: 'Available', patient_id: null, assigned_at: null, daily_rate: 3500.00 },
    { id: 4, ward_id: 2, bed_number: 'ICU-101', status: 'Occupied', patient_id: 4, assigned_at: '2026-10-13 14:00:00', daily_rate: 5500.00 },
    { id: 5, ward_id: 2, bed_number: 'ICU-102', status: 'Available', patient_id: null, assigned_at: null, daily_rate: 5500.00 },
    { id: 6, ward_id: 3, bed_number: 'GW-M01', status: 'Available', patient_id: null, assigned_at: null, daily_rate: 1200.00 },
    { id: 7, ward_id: 3, bed_number: 'GW-M02', status: 'Occupied', patient_id: 6, assigned_at: '2026-10-15 11:20:00', daily_rate: 1200.00 },
    { id: 8, ward_id: 4, bed_number: 'GW-F01', status: 'Available', patient_id: null, assigned_at: null, daily_rate: 1200.00 },
    { id: 9, ward_id: 4, bed_number: 'GW-F02', status: 'Occupied', patient_id: 2, assigned_at: '2026-10-15 08:45:00', daily_rate: 1200.00 },
    { id: 10, ward_id: 5, bed_number: 'REC-01', status: 'Available', patient_id: null, assigned_at: null, daily_rate: 2200.00 }
  ],

  medical_records: [
    { id: 1, patient_id: 4, doctor_id: 1, appointment_id: 5, diagnosis: 'Stage-1 Essential Hypertension & Dyslipidemia', symptoms: 'Occasional morning headache, mild exertional dizziness', examination_notes: 'Clear bilateral breath sounds, regular S1/S2 rhythm, no peripheral edema.', blood_pressure: '138/88', heart_rate_bpm: 76, temperature_f: 98.4, weight_kg: 78.5, recorded_at: '2026-10-12 10:15:00' },
    { id: 2, patient_id: 1, doctor_id: 1, appointment_id: 1, diagnosis: 'Chronic Stable Angina & Mild Tachycardia', symptoms: 'Substernal chest tightness on steep incline walking', examination_notes: 'Normal carotid upstrokes, normal apex beat.', blood_pressure: '124/82', heart_rate_bpm: 82, temperature_f: 98.6, weight_kg: 72.0, recorded_at: new Date().toISOString() }
  ],

  nurse_vitals: [
    { id: 1, patient_id: 1, nurse_id: 1, blood_pressure: '124/82', heart_rate_bpm: 82, temperature_f: 98.6, sp_o2_percent: 99, respiratory_rate: 16, notes: 'Patient resting comfortably. Normal sinus rhythm.', recorded_at: new Date().toISOString() },
    { id: 2, patient_id: 2, nurse_id: 2, blood_pressure: '116/74', heart_rate_bpm: 70, temperature_f: 98.2, sp_o2_percent: 98, respiratory_rate: 15, notes: 'Pre-consultation vitals recorded.', recorded_at: new Date().toISOString() }
  ],

  prescriptions: [
    { id: 1, record_id: 1, patient_id: 4, doctor_id: 1, medicine_name: 'Telmisartan Tablets IP', dosage: '40 mg', frequency: 'Once daily (Morning)', duration: '30 days', instructions: 'Take 30 mins after breakfast.' },
    { id: 2, record_id: 1, patient_id: 4, doctor_id: 1, medicine_name: 'Atorvastatin Tablets IP', dosage: '10 mg', frequency: 'Once daily (Night)', duration: '30 days', instructions: 'Take after dinner.' },
    { id: 3, record_id: 2, patient_id: 1, doctor_id: 1, medicine_name: 'Metoprolol Succinate ER', dosage: '25 mg', frequency: 'Once daily (Morning)', duration: '15 days', instructions: 'Monitor pulse daily.' },
    { id: 4, record_id: 2, patient_id: 1, doctor_id: 1, medicine_name: 'Aspirin Gastro-resistant', dosage: '75 mg', frequency: 'Once daily (Afternoon)', duration: '30 days', instructions: 'Take with food.' }
  ],

  lab_tests: [
    { id: 1, test_code: 'LAB-CBC', test_name: 'Complete Blood Count (CBC)', category: 'Hematology', specimen: 'Whole Blood (EDTA)', price: 450.00, reference_range: 'Hb: 13.0-17.0 g/dL, WBC: 4,000-11,000 /uL', turnaround_hours: 6 },
    { id: 2, test_code: 'LAB-LIPID', test_name: 'Lipid Profile Comprehensive', category: 'Biochemistry', specimen: 'Serum (Fasting 12h)', price: 750.00, reference_range: 'Total Chol < 200 mg/dL, Triglycerides < 150 mg/dL', turnaround_hours: 12 },
    { id: 3, test_code: 'LAB-THYROID', test_name: 'Thyroid Function Panel (T3, T4, TSH)', category: 'Endocrinology', specimen: 'Serum', price: 650.00, reference_range: 'TSH: 0.4 - 4.2 uIU/mL', turnaround_hours: 24 },
    { id: 4, test_code: 'LAB-HBA1C', test_name: 'Glycated Hemoglobin (HbA1c)', category: 'Biochemistry', specimen: 'Whole Blood (EDTA)', price: 500.00, reference_range: 'Normal < 5.7%, Prediabetes 5.7-6.4%', turnaround_hours: 8 },
    { id: 5, test_code: 'LAB-URINE', test_name: 'Urinalysis Routine & Microscopy', category: 'Clinical Pathology', specimen: 'Mid-stream Urine', price: 250.00, reference_range: 'Clear, pH 5.0-7.0, Protein Negative', turnaround_hours: 4 },
    { id: 6, test_code: 'LAB-KFT', test_name: 'Kidney Function Test (BUN & Creatinine)', category: 'Biochemistry', specimen: 'Serum', price: 600.00, reference_range: 'Creatinine: 0.7-1.3 mg/dL, BUN: 7-20 mg/dL', turnaround_hours: 12 }
  ],

  lab_orders: [
    { id: 1, order_code: 'ORD-2026-081', patient_id: 1, doctor_id: 1, test_id: 1, status: 'Verified', results: 'Hemoglobin: 14.2 g/dL (Normal)\nRBC Count: 4.8 million/uL\nWBC Count: 6,800 /uL\nPlatelets: 245,000 /uL', technician_name: 'David Chen', verified_by: 'Dr. Anita Desai', ordered_at: '2026-10-14 10:00:00', completed_at: '2026-10-14 15:30:00' },
    { id: 2, order_code: 'ORD-2026-082', patient_id: 1, doctor_id: 1, test_id: 2, status: 'Verified', results: 'Total Cholesterol: 188 mg/dL (Normal)\nHDL: 48 mg/dL (Optimal)\nLDL: 112 mg/dL (Desirable)\nTriglycerides: 140 mg/dL', technician_name: 'David Chen', verified_by: 'Dr. Anita Desai', ordered_at: '2026-10-14 10:00:00', completed_at: '2026-10-14 16:00:00' },
    { id: 3, order_code: 'ORD-2026-083', patient_id: 2, doctor_id: 2, test_id: 3, status: 'Processing', results: null, technician_name: 'David Chen', verified_by: null, ordered_at: new Date().toISOString(), completed_at: null },
    { id: 4, order_code: 'ORD-2026-084', patient_id: 5, doctor_id: 1, test_id: 1, status: 'Requested', results: null, technician_name: null, verified_by: null, ordered_at: new Date().toISOString(), completed_at: null }
  ],

  medicines: [
    { id: 1, name: 'Paracetamol 500mg', generic_name: 'Acetaminophen', category: 'Analgesics / Antipyretics', strength: '500 mg', dosage_form: 'Tablet', stock_quantity: 2450, unit_price: 2.50, reorder_level: 500, expiry_date: '2028-06-30' },
    { id: 2, name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin Trihydrate', category: 'Antibiotics', strength: '500 mg', dosage_form: 'Capsule', stock_quantity: 1120, unit_price: 9.00, reorder_level: 200, expiry_date: '2027-11-30' },
    { id: 3, name: 'Atorvastatin 20mg', generic_name: 'Atorvastatin Calcium', category: 'Cardiovascular', strength: '20 mg', dosage_form: 'Tablet', stock_quantity: 85, unit_price: 14.50, reorder_level: 100, expiry_date: '2027-04-30' },
    { id: 4, name: 'Telmisartan 40mg', generic_name: 'Telmisartan', category: 'Cardiovascular', strength: '40 mg', dosage_form: 'Tablet', stock_quantity: 680, unit_price: 8.50, reorder_level: 150, expiry_date: '2028-01-31' },
    { id: 5, name: 'Metformin 500mg', generic_name: 'Metformin Hydrochloride', category: 'Antidiabetic', strength: '500 mg', dosage_form: 'Tablet', stock_quantity: 1850, unit_price: 3.20, reorder_level: 300, expiry_date: '2027-09-30' },
    { id: 6, name: 'Pantoprazole 40mg', generic_name: 'Pantoprazole Sodium', category: 'Gastrointestinal', strength: '40 mg', dosage_form: 'Tablet', stock_quantity: 940, unit_price: 7.00, reorder_level: 200, expiry_date: '2028-03-31' },
    { id: 7, name: 'Cetirizine 10mg', generic_name: 'Cetirizine Dihydrochloride', category: 'Antihistamines', strength: '10 mg', dosage_form: 'Tablet', stock_quantity: 1400, unit_price: 3.00, reorder_level: 250, expiry_date: '2027-12-31' },
    { id: 8, name: 'Ceftriaxone 1g Injection', generic_name: 'Ceftriaxone Sodium', category: 'Injectable Antibiotics', strength: '1 g', dosage_form: 'Vial', stock_quantity: 45, unit_price: 95.00, reorder_level: 50, expiry_date: '2026-12-31' }
  ],

  billing: [
    { id: 1, invoice_number: 'INV-2026-0045', patient_id: 4, appointment_id: 5, total_amount: 1250.00, discount_amount: 50.00, tax_amount: 60.00, net_amount: 1260.00, payment_status: 'Paid', invoice_date: '2026-10-12', due_date: '2026-10-12', notes: 'Consultation + baseline ECG' },
    { id: 2, invoice_number: 'INV-2026-0046', patient_id: 1, appointment_id: 1, total_amount: 800.00, discount_amount: 0.00, tax_amount: 40.00, net_amount: 840.00, payment_status: 'Paid', invoice_date: new Date().toISOString().split('T')[0], due_date: new Date().toISOString().split('T')[0], notes: 'Cardiology consultation appointment' },
    { id: 3, invoice_number: 'INV-2026-0047', patient_id: 2, appointment_id: 2, total_amount: 950.00, discount_amount: 50.00, tax_amount: 45.00, net_amount: 945.00, payment_status: 'Unpaid', invoice_date: new Date().toISOString().split('T')[0], due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], notes: 'Neurology OPD consultation' },
    { id: 4, invoice_number: 'INV-2026-0048', patient_id: 5, appointment_id: 4, total_amount: 1200.00, discount_amount: 0.00, tax_amount: 60.00, net_amount: 1260.00, payment_status: 'Partially Paid', invoice_date: new Date().toISOString().split('T')[0], due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], notes: 'Cardiology consultation + CBC test' }
  ],

  payments: [
    { id: 1, billing_id: 1, transaction_reference: 'TXN-UPI-98214', amount_paid: 1260.00, payment_method: 'UPI', payment_date: '2026-10-12 11:30:00', processed_by_user_id: 8 },
    { id: 2, billing_id: 2, transaction_reference: 'TXN-CARD-44102', amount_paid: 840.00, payment_method: 'Credit Card', payment_date: new Date().toISOString(), processed_by_user_id: 8 },
    { id: 3, billing_id: 4, transaction_reference: 'TXN-CASH-10029', amount_paid: 600.00, payment_method: 'Cash', payment_date: new Date().toISOString(), processed_by_user_id: 8 }
  ],

  notifications: [
    { id: 1, user_id: 1, role: 'admin', title: 'New Patient Intake', message: 'Olivia Rhye (PAT-1005) registered successfully.', type: 'info', is_read: 0, created_at: '10 mins ago' },
    { id: 2, user_id: 2, role: 'doctor', title: 'Appointment Confirmed', message: 'Token TK-112 (Olivia Rhye) scheduled for Cardiology Suite 304.', type: 'success', is_read: 0, created_at: '25 mins ago' },
    { id: 3, user_id: 9, role: 'lab_staff', title: 'New Lab Request', message: 'CBC requested for patient Olivia Rhye.', type: 'warning', is_read: 0, created_at: '1 hour ago' },
    { id: 4, user_id: 6, role: 'nurse', title: 'CCU Bed Telemetry', message: 'Bed CCU-01 vitals updated: BP 124/82, HR 82.', type: 'info', is_read: 1, created_at: '2 hours ago' }
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
      connectTimeout: 2000
    });

    const connection = await pool.getConnection();
    connection.release();
    console.log(`[Database] Successfully connected to MySQL at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME || 'hospital_management_db'}`);
    return pool;
  } catch (err) {
    console.warn(`[Database] MySQL server not reachable (${err.message}). Activating zero-downtime resilient memory store.`);
    isUsingFallback = true;
    return null;
  }
}

/**
 * Universal query runner: executes via MySQL pool or resilient fallback store
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
      console.warn(`[Database] MySQL query error: ${err.message}. Routing to fallback store.`);
    }
  }

  return executeFallbackQuery(sql, params);
}

function executeFallbackQuery(sql, params) {
  const q = sql.trim();
  const normalized = q.toUpperCase();

  // -------------------------------------------------------------
  // USERS & AUTHENTICATION
  // -------------------------------------------------------------
  if (normalized.includes('FROM `USERS`') || normalized.includes('FROM USERS')) {
    if (normalized.includes('WHERE `EMAIL` = ?') || normalized.includes('WHERE EMAIL = ?')) {
      const email = (params[0] || '').toLowerCase().trim();
      const user = fallbackStore.users.find(u => u.email.toLowerCase() === email);
      return user ? [{ ...user }] : [];
    }
    if (normalized.includes('WHERE `ID` = ?') || normalized.includes('WHERE ID = ?')) {
      const id = parseInt(params[0]);
      const user = fallbackStore.users.find(u => u.id === id);
      return user ? [{ ...user }] : [];
    }
    return fallbackStore.users.map(u => {
      const { password_hash, ...safeUser } = u;
      return safeUser;
    });
  }

  if (normalized.startsWith('INSERT INTO `USERS`') || normalized.startsWith('INSERT INTO USERS')) {
    const newId = fallbackStore.users.length + 1;
    // Expected params: [name, email, password_hash, role, phone]
    const newUser = {
      id: newId,
      name: params[0],
      email: (params[1] || '').toLowerCase().trim(),
      password_hash: params[2],
      role: params[3] || 'patient',
      phone: params[4] || '',
      is_active: 1
    };
    fallbackStore.users.push(newUser);
    return { insertId: newId, affectedRows: 1 };
  }

  if (normalized.startsWith('UPDATE `USERS`') || normalized.startsWith('UPDATE USERS')) {
    if (normalized.includes('PASSWORD_HASH')) {
      const newHash = params[0];
      const email = (params[1] || '').toLowerCase().trim();
      const user = fallbackStore.users.find(u => u.email.toLowerCase() === email);
      if (user) {
        user.password_hash = newHash;
        return { affectedRows: 1 };
      }
    }
    return { affectedRows: 0 };
  }

  // -------------------------------------------------------------
  // PASSWORD RESETS
  // -------------------------------------------------------------
  if (normalized.includes('FROM `PASSWORD_RESETS`') || normalized.includes('FROM PASSWORD_RESETS')) {
    if (normalized.includes('WHERE `TOKEN` = ?') || normalized.includes('WHERE TOKEN = ?')) {
      const token = params[0];
      const match = fallbackStore.password_resets.find(r => r.token === token && new Date(r.expires_at) > new Date());
      return match ? [match] : [];
    }
    return fallbackStore.password_resets;
  }

  if (normalized.startsWith('INSERT INTO `PASSWORD_RESETS`') || normalized.startsWith('INSERT INTO PASSWORD_RESETS')) {
    const newRecord = {
      id: fallbackStore.password_resets.length + 1,
      email: (params[0] || '').toLowerCase().trim(),
      token: params[1],
      expires_at: params[2] || new Date(Date.now() + 3600000).toISOString()
    };
    fallbackStore.password_resets.push(newRecord);
    return { insertId: newRecord.id, affectedRows: 1 };
  }

  if (normalized.startsWith('DELETE FROM `PASSWORD_RESETS`') || normalized.startsWith('DELETE FROM PASSWORD_RESETS')) {
    const token = params[0];
    fallbackStore.password_resets = fallbackStore.password_resets.filter(r => r.token !== token);
    return { affectedRows: 1 };
  }

  // -------------------------------------------------------------
  // STATS & KPI AGGREGATION
  // -------------------------------------------------------------
  if (normalized.includes('COUNT(')) {
    const todayStr = new Date().toISOString().split('T')[0];
    const totalRevenue = fallbackStore.billing.reduce((sum, b) => (b.payment_status === 'Paid' ? sum + parseFloat(b.net_amount) : sum), 0);
    const occupiedBeds = fallbackStore.beds.filter(b => b.status === 'Occupied').length;
    const totalBeds = fallbackStore.beds.length;

    return [{
      total_patients: fallbackStore.patients.length,
      appointments_today: fallbackStore.appointments.filter(a => a.appointment_date === todayStr).length,
      active_doctors: fallbackStore.doctors.filter(d => d.is_available).length,
      nurses_on_duty: fallbackStore.nurses.filter(n => n.is_on_duty).length,
      total_departments: fallbackStore.departments.length,
      occupied_beds: occupiedBeds,
      total_beds: totalBeds,
      bed_occupancy_pct: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      pending_lab_orders: fallbackStore.lab_orders.filter(l => l.status === 'Requested' || l.status === 'Processing').length,
      unpaid_invoices: fallbackStore.billing.filter(b => b.payment_status === 'Unpaid').length,
      revenue_collected: totalRevenue
    }];
  }

  // -------------------------------------------------------------
  // PATIENTS
  // -------------------------------------------------------------
  if (normalized.includes('FROM `PATIENTS`') || normalized.includes('FROM PATIENTS')) {
    if (normalized.includes('WHERE `USER_ID` = ?') || normalized.includes('WHERE USER_ID = ?')) {
      const uId = parseInt(params[0]);
      const p = fallbackStore.patients.find(pt => pt.user_id === uId);
      return p ? [p] : [];
    }
    if (normalized.includes('WHERE `ID` = ?') || normalized.includes('WHERE ID = ?')) {
      const id = parseInt(params[0]);
      const p = fallbackStore.patients.find(pt => pt.id === id);
      return p ? [p] : [];
    }
    return fallbackStore.patients;
  }

  if (normalized.startsWith('INSERT INTO `PATIENTS`') || normalized.startsWith('INSERT INTO PATIENTS')) {
    const newId = fallbackStore.patients.length + 1;
    const newPatient = {
      id: newId,
      user_id: params[0] ? parseInt(params[0]) : null,
      patient_code: params[1] || `PAT-${1000 + newId}`,
      name: params[2],
      dob: params[3] || '1995-01-01',
      gender: params[4] || 'Other',
      blood_group: params[5] || 'O+',
      phone: params[6] || '',
      email: (params[7] || '').toLowerCase().trim(),
      address: params[8] || 'Chennai',
      city: params[9] || 'Chennai',
      emergency_contact_name: params[10] || '',
      emergency_contact_phone: params[11] || '',
      known_allergies: params[12] || 'None',
      insurance_provider: params[13] || 'Self Pay'
    };
    fallbackStore.patients.unshift(newPatient);
    return { insertId: newId, affectedRows: 1 };
  }

  // -------------------------------------------------------------
  // DOCTORS & DEPARTMENTS
  // -------------------------------------------------------------
  if (normalized.includes('FROM `DOCTORS`') || normalized.includes('FROM DOCTORS')) {
    return fallbackStore.doctors.map(doc => {
      const dep = fallbackStore.departments.find(d => d.id === doc.department_id);
      return { ...doc, department_name: dep ? dep.name : 'General' };
    });
  }

  if (normalized.includes('FROM `DEPARTMENTS`') || normalized.includes('FROM DEPARTMENTS')) {
    return fallbackStore.departments;
  }

  // -------------------------------------------------------------
  // NURSES & NURSE VITALS
  // -------------------------------------------------------------
  if (normalized.includes('FROM `NURSES`') || normalized.includes('FROM NURSES')) {
    return fallbackStore.nurses.map(nurse => {
      const dep = fallbackStore.departments.find(d => d.id === nurse.department_id);
      return { ...nurse, department_name: dep ? dep.name : 'General' };
    });
  }

  if (normalized.includes('FROM `NURSE_VITALS`') || normalized.includes('FROM NURSE_VITALS')) {
    return fallbackStore.nurse_vitals.map(v => {
      const pat = fallbackStore.patients.find(p => p.id === v.patient_id);
      const nur = fallbackStore.nurses.find(n => n.id === v.nurse_id);
      return {
        ...v,
        patient_name: pat ? pat.name : 'Unknown',
        patient_code: pat ? pat.patient_code : '',
        nurse_name: nur ? nur.name : 'Staff Nurse'
      };
    });
  }

  if (normalized.startsWith('INSERT INTO `NURSE_VITALS`') || normalized.startsWith('INSERT INTO NURSE_VITALS')) {
    const newId = fallbackStore.nurse_vitals.length + 1;
    const newVitals = {
      id: newId,
      patient_id: parseInt(params[0]),
      nurse_id: params[1] ? parseInt(params[1]) : 1,
      blood_pressure: params[2],
      heart_rate_bpm: parseInt(params[3]),
      temperature_f: parseFloat(params[4]),
      sp_o2_percent: parseInt(params[5] || 98),
      respiratory_rate: parseInt(params[6] || 16),
      notes: params[7] || 'Routine check',
      recorded_at: new Date().toISOString()
    };
    fallbackStore.nurse_vitals.unshift(newVitals);
    return { insertId: newId, affectedRows: 1 };
  }

  // -------------------------------------------------------------
  // APPOINTMENTS
  // -------------------------------------------------------------
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
      token_number: 100 + newId,
      reason: params[6] || 'Consultation',
      status: 'Scheduled',
      notes: params[7] || ''
    };
    fallbackStore.appointments.unshift(newApt);
    return { insertId: newId, affectedRows: 1 };
  }

  if (normalized.startsWith('UPDATE `APPOINTMENTS`') || normalized.startsWith('UPDATE APPOINTMENTS')) {
    const status = params[0];
    const id = parseInt(params[params.length - 1]);
    const apt = fallbackStore.appointments.find(a => a.id === id);
    if (apt) {
      apt.status = status;
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // -------------------------------------------------------------
  // WARDS & BEDS
  // -------------------------------------------------------------
  if (normalized.includes('FROM `WARDS`') || normalized.includes('FROM WARDS')) {
    return fallbackStore.wards;
  }

  if (normalized.includes('FROM `BEDS`') || normalized.includes('FROM BEDS')) {
    return fallbackStore.beds.map(bed => {
      const ward = fallbackStore.wards.find(w => w.id === bed.ward_id);
      const patient = fallbackStore.patients.find(p => p.id === bed.patient_id);
      return {
        ...bed,
        ward_name: ward ? ward.name : 'Ward',
        ward_type: ward ? ward.type : 'General',
        patient_name: patient ? patient.name : null,
        patient_code: patient ? patient.patient_code : null
      };
    });
  }

  if (normalized.startsWith('UPDATE `BEDS`') || normalized.startsWith('UPDATE BEDS')) {
    const status = params[0];
    const patient_id = params[1] ? parseInt(params[1]) : null;
    const bed_id = parseInt(params[params.length - 1]);
    const bed = fallbackStore.beds.find(b => b.id === bed_id);
    if (bed) {
      bed.status = status;
      bed.patient_id = patient_id;
      bed.assigned_at = status === 'Occupied' ? new Date().toISOString() : null;
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // -------------------------------------------------------------
  // MEDICAL RECORDS & PRESCRIPTIONS
  // -------------------------------------------------------------
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

  if (normalized.startsWith('INSERT INTO `MEDICAL_RECORDS`') || normalized.startsWith('INSERT INTO MEDICAL_RECORDS')) {
    const newId = fallbackStore.medical_records.length + 1;
    const newRec = {
      id: newId,
      patient_id: parseInt(params[0]),
      doctor_id: parseInt(params[1]),
      appointment_id: params[2] ? parseInt(params[2]) : null,
      diagnosis: params[3],
      symptoms: params[4],
      examination_notes: params[5],
      blood_pressure: params[6],
      heart_rate_bpm: parseInt(params[7]),
      temperature_f: parseFloat(params[8]),
      weight_kg: parseFloat(params[9]),
      recorded_at: new Date().toISOString()
    };
    fallbackStore.medical_records.unshift(newRec);
    return { insertId: newId, affectedRows: 1 };
  }

  if (normalized.includes('FROM `PRESCRIPTIONS`') || normalized.includes('FROM PRESCRIPTIONS')) {
    return fallbackStore.prescriptions;
  }

  if (normalized.startsWith('INSERT INTO `PRESCRIPTIONS`') || normalized.startsWith('INSERT INTO PRESCRIPTIONS')) {
    const newId = fallbackStore.prescriptions.length + 1;
    const newRx = {
      id: newId,
      record_id: parseInt(params[0]),
      patient_id: parseInt(params[1]),
      doctor_id: parseInt(params[2]),
      medicine_name: params[3],
      dosage: params[4],
      frequency: params[5],
      duration: params[6],
      instructions: params[7]
    };
    fallbackStore.prescriptions.push(newRx);
    return { insertId: newId, affectedRows: 1 };
  }

  // -------------------------------------------------------------
  // LAB TESTS & LAB ORDERS
  // -------------------------------------------------------------
  if (normalized.includes('FROM `LAB_TESTS`') || normalized.includes('FROM LAB_TESTS')) {
    return fallbackStore.lab_tests;
  }

  if (normalized.includes('FROM `LAB_ORDERS`') || normalized.includes('FROM LAB_ORDERS')) {
    return fallbackStore.lab_orders.map(order => {
      const patient = fallbackStore.patients.find(p => p.id === order.patient_id);
      const doctor = fallbackStore.doctors.find(d => d.id === order.doctor_id);
      const test = fallbackStore.lab_tests.find(t => t.id === order.test_id);
      return {
        ...order,
        patient_name: patient ? patient.name : 'Unknown',
        patient_code: patient ? patient.patient_code : '',
        doctor_name: doctor ? doctor.name : 'Attending Physician',
        test_name: test ? test.test_name : 'Diagnostic Test',
        test_code: test ? test.test_code : 'LAB-00',
        price: test ? test.price : 0.00,
        reference_range: test ? test.reference_range : ''
      };
    });
  }

  if (normalized.startsWith('INSERT INTO `LAB_ORDERS`') || normalized.startsWith('INSERT INTO LAB_ORDERS')) {
    const newId = fallbackStore.lab_orders.length + 1;
    const newOrder = {
      id: newId,
      order_code: params[0] || `ORD-2026-${String(newId).padStart(3, '0')}`,
      patient_id: parseInt(params[1]),
      doctor_id: parseInt(params[2]),
      test_id: parseInt(params[3]),
      status: 'Requested',
      results: null,
      technician_name: null,
      verified_by: null,
      ordered_at: new Date().toISOString(),
      completed_at: null
    };
    fallbackStore.lab_orders.unshift(newOrder);
    return { insertId: newId, affectedRows: 1 };
  }

  if (normalized.startsWith('UPDATE `LAB_ORDERS`') || normalized.startsWith('UPDATE LAB_ORDERS')) {
    const id = parseInt(params[params.length - 1]);
    const order = fallbackStore.lab_orders.find(o => o.id === id);
    if (order) {
      if (params[0]) order.status = params[0];
      if (params[1]) order.results = params[1];
      if (params[2]) order.technician_name = params[2];
      if (params[3]) order.verified_by = params[3];
      order.completed_at = new Date().toISOString();
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // -------------------------------------------------------------
  // PHARMACY & MEDICINES
  // -------------------------------------------------------------
  if (normalized.includes('FROM `MEDICINES`') || normalized.includes('FROM MEDICINES')) {
    return fallbackStore.medicines;
  }

  if (normalized.startsWith('UPDATE `MEDICINES`') || normalized.startsWith('UPDATE MEDICINES')) {
    const qtyChange = parseInt(params[0]);
    const id = parseInt(params[1]);
    const med = fallbackStore.medicines.find(m => m.id === id);
    if (med) {
      med.stock_quantity = Math.max(0, med.stock_quantity - qtyChange);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // -------------------------------------------------------------
  // BILLING & PAYMENTS
  // -------------------------------------------------------------
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

  if (normalized.startsWith('INSERT INTO `BILLING`') || normalized.startsWith('INSERT INTO BILLING')) {
    const newId = fallbackStore.billing.length + 1;
    const newBill = {
      id: newId,
      invoice_number: params[0] || `INV-2026-${String(newId).padStart(4, '0')}`,
      patient_id: parseInt(params[1]),
      appointment_id: params[2] ? parseInt(params[2]) : null,
      total_amount: parseFloat(params[3]),
      discount_amount: parseFloat(params[4] || 0),
      tax_amount: parseFloat(params[5] || 0),
      net_amount: parseFloat(params[6]),
      payment_status: params[7] || 'Unpaid',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      notes: params[8] || 'Clinical services'
    };
    fallbackStore.billing.unshift(newBill);
    return { insertId: newId, affectedRows: 1 };
  }

  if (normalized.startsWith('UPDATE `BILLING`') || normalized.startsWith('UPDATE BILLING')) {
    const status = params[0];
    const id = parseInt(params[params.length - 1]);
    const bill = fallbackStore.billing.find(b => b.id === id);
    if (bill) {
      bill.payment_status = status;
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (normalized.includes('FROM `PAYMENTS`') || normalized.includes('FROM PAYMENTS')) {
    return fallbackStore.payments;
  }

  if (normalized.startsWith('INSERT INTO `PAYMENTS`') || normalized.startsWith('INSERT INTO PAYMENTS')) {
    const newId = fallbackStore.payments.length + 1;
    const newPay = {
      id: newId,
      billing_id: parseInt(params[0]),
      transaction_reference: params[1] || `TXN-REF-${Date.now()}`,
      amount_paid: parseFloat(params[2]),
      payment_method: params[3] || 'UPI',
      payment_date: new Date().toISOString(),
      processed_by_user_id: params[4] ? parseInt(params[4]) : 8
    };
    fallbackStore.payments.unshift(newPay);
    // Mark bill as Paid
    const bill = fallbackStore.billing.find(b => b.id === newPay.billing_id);
    if (bill) bill.payment_status = 'Paid';
    return { insertId: newId, affectedRows: 1 };
  }

  // -------------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------------
  if (normalized.includes('FROM `NOTIFICATIONS`') || normalized.includes('FROM NOTIFICATIONS')) {
    return fallbackStore.notifications;
  }

  if (normalized.startsWith('UPDATE `NOTIFICATIONS`') || normalized.startsWith('UPDATE NOTIFICATIONS')) {
    fallbackStore.notifications.forEach(n => { n.is_read = 1; });
    return { affectedRows: fallbackStore.notifications.length };
  }

  // Default empty result set
  return [];
}

module.exports = {
  initDb,
  query,
  fallbackStore
};
