-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS) - SEED DATA
-- Pre-populated production-grade demo records
-- ============================================================================

USE `hospital_management_db`;

-- 1. SEED DEPARTMENTS
INSERT INTO `departments` (`id`, `name`, `code`, `description`, `floor_location`, `phone_extension`) VALUES
(1, 'Cardiology', 'CARD', 'Comprehensive heart health, cardiovascular diagnosis, and interventional surgery.', 'Block A, 3rd Floor', '301'),
(2, 'Neurology', 'NEUR', 'Advanced brain, neurological disorders, spine, and peripheral nerve care.', 'Block B, 4th Floor', '402'),
(3, 'Orthopedics', 'ORTH', 'Bone, joint surgery, sports injuries, and rehabilitation.', 'Block A, 2nd Floor', '205'),
(4, 'Pediatrics', 'PED', 'Child development, newborn healthcare, immunizations, and pediatric emergencies.', 'Block C, 1st Floor', '108'),
(5, 'General Medicine', 'GEN', 'Primary adult care, internal medicine, diagnosis, and chronic condition management.', 'Block A, 1st Floor', '102'),
(6, 'Emergency & Trauma', 'EMERG', '24/7 Level-1 trauma resuscitation, acute intensive care, and triage.', 'Block G, Ground Floor', '100');

-- 2. SEED USERS (Bcrypt hash for password 'Password@123': $2a$10$wE8Fk6Bq9sC6Tvh87V4eEuS0vW2o8zP6p5pQh3c0.1Z7Z8Jk3r6m.)
-- Passwords will also be auto-seeded dynamically via setup-db.js
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `phone`, `is_active`) VALUES
(1, 'Dr. Robert Vance', 'admin@hospital.org', '$2a$10$7Z88YfF94XhV1a6gBw1vtu7C7k1u2G3h4J5k6L7m8n9o0p1q2r3s4', 'admin', '+91 98765 43210', 1),
(2, 'Dr. Arvind Sharma', 'dr.sharma@hospital.org', '$2a$10$7Z88YfF94XhV1a6gBw1vtu7C7k1u2G3h4J5k6L7m8n9o0p1q2r3s4', 'doctor', '+91 98765 11111', 1),
(3, 'Dr. Anita Desai', 'dr.anita@hospital.org', '$2a$10$7Z88YfF94XhV1a6gBw1vtu7C7k1u2G3h4J5k6L7m8n9o0p1q2r3s4', 'doctor', '+91 98765 22222', 1),
(4, 'Dr. Rajesh Patel', 'dr.rajesh@hospital.org', '$2a$10$7Z88YfF94XhV1a6gBw1vtu7C7k1u2G3h4J5k6L7m8n9o0p1q2r3s4', 'doctor', '+91 98765 33333', 1),
(5, 'Dr. Priya Nambiar', 'dr.priya@hospital.org', '$2a$10$7Z88YfF94XhV1a6gBw1vtu7C7k1u2G3h4J5k6L7m8n9o0p1q2r3s4', 'doctor', '+91 98765 44444', 1),
(6, 'Meera Nair', 'receptionist@hospital.org', '$2a$10$7Z88YfF94XhV1a6gBw1vtu7C7k1u2G3h4J5k6L7m8n9o0p1q2r3s4', 'receptionist', '+91 98765 55555', 1),
(7, 'Arun Kumar', 'arun@example.com', '$2a$10$7Z88YfF94XhV1a6gBw1vtu7C7k1u2G3h4J5k6L7m8n9o0p1q2r3s4', 'patient', '+91 98401 23456', 1),
(8, 'Meena Sundaram', 'meena@example.com', '$2a$10$7Z88YfF94XhV1a6gBw1vtu7C7k1u2G3h4J5k6L7m8n9o0p1q2r3s4', 'patient', '+91 98402 34567', 1);

-- 3. SEED DOCTORS
INSERT INTO `doctors` (`id`, `user_id`, `department_id`, `name`, `specialization`, `qualification`, `license_number`, `phone`, `email`, `consultation_fee`, `room_number`, `availability_days`, `shift_start`, `shift_end`, `is_available`) VALUES
(1, 2, 1, 'Dr. Arvind Sharma', 'Interventional Cardiologist', 'MBBS, MD, DM (Cardiology)', 'MCI-CARD-2015-8842', '+91 98765 11111', 'dr.sharma@hospital.org', 800.00, 'Suite 304', 'Mon,Wed,Fri', '09:00:00', '16:00:00', 1),
(2, 3, 2, 'Dr. Anita Desai', 'Consultant Neurologist', 'MBBS, MD, DNB (Neurology)', 'MCI-NEUR-2018-9921', '+91 98765 22222', 'dr.anita@hospital.org', 950.00, 'Suite 408', 'Tue,Thu,Sat', '10:00:00', '17:00:00', 1),
(3, 4, 3, 'Dr. Rajesh Patel', 'Orthopedic Surgeon', 'MBBS, MS (Ortho), M.Ch', 'MCI-ORTH-2016-7731', '+91 98765 33333', 'dr.rajesh@hospital.org', 750.00, 'Suite 202', 'Mon,Tue,Thu,Fri', '08:30:00', '15:30:00', 1),
(4, 5, 4, 'Dr. Priya Nambiar', 'Senior Pediatrician', 'MBBS, MD (Pediatrics), DCH', 'MCI-PEDI-2019-3312', '+91 98765 44444', 'dr.priya@hospital.org', 600.00, 'Suite 105', 'Mon,Tue,Wed,Thu,Sat', '09:30:00', '16:30:00', 1);

-- 4. SEED PATIENTS
INSERT INTO `patients` (`id`, `user_id`, `patient_code`, `name`, `dob`, `gender`, `blood_group`, `phone`, `email`, `address`, `city`, `emergency_contact_name`, `emergency_contact_phone`, `known_allergies`, `insurance_provider`) VALUES
(1, 7, 'PAT-1001', 'Arun Kumar', '1988-06-14', 'Male', 'O+', '+91 98401 23456', 'arun@example.com', '42 Gandhi Nagar, 2nd Main Rd', 'Chennai', 'Revathi Kumar (Wife)', '+91 98401 99999', 'Penicillin', 'Star Health Premier'),
(2, 8, 'PAT-1002', 'Meena Sundaram', '1995-11-20', 'Female', 'B+', '+91 98402 34567', 'meena@example.com', '15 Anna Salai, Royapettah', 'Chennai', 'Sundaram K (Father)', '+91 98402 88888', 'None known', 'HDFC ERGO Optima'),
(3, NULL, 'PAT-1003', 'Kavitha R', '1976-03-08', 'Female', 'A+', '+91 98403 45678', 'kavitha.r@gmail.com', '88 Ring Road, K.K. Nagar', 'Madurai', 'Ramesh R (Husband)', '+91 98403 77777', 'Sulfa drugs', 'National Insurance'),
(4, NULL, 'PAT-1004', 'Suresh Babu', '1982-09-25', 'Male', 'AB+', '+91 98404 56789', 'suresh.babu@gmail.com', '12 West Cross Street', 'Madurai', 'Deepa Babu (Sister)', '+91 98404 66666', 'Aspirin', 'Care Health Insurance');

-- 5. SEED APPOINTMENTS
INSERT INTO `appointments` (`id`, `appointment_number`, `patient_id`, `doctor_id`, `department_id`, `appointment_date`, `appointment_time`, `token_number`, `reason`, `status`, `notes`) VALUES
(1, 'APT-2026-0101', 1, 1, 1, CURDATE(), '10:00:00', 1, 'Routine blood pressure review and echocardiogram follow-up.', 'Scheduled', 'Patient reports slight exertion fatigue.'),
(2, 'APT-2026-0102', 2, 2, 2, CURDATE(), '11:30:00', 2, 'Recurrent migraine headache and visual aura evaluation.', 'Scheduled', 'Prescribed diary tracking for trigger foods.'),
(3, 'APT-2026-0103', 3, 3, 3, CURDATE(), '14:00:00', 3, 'Post-operative right knee arthroscopy assessment.', 'Scheduled', 'Bring latest weight-bearing X-Ray films.'),
(4, 'APT-2026-0098', 4, 1, 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:30:00', 1, 'Hypercholesterolemia management and lipid profile triage.', 'Completed', 'Lipid panel ordered and dietary modifications advised.');

-- 6. SEED MEDICAL RECORDS (EHR)
INSERT INTO `medical_records` (`id`, `patient_id`, `doctor_id`, `appointment_id`, `diagnosis`, `symptoms`, `examination_notes`, `blood_pressure`, `heart_rate_bpm`, `temperature_f`, `weight_kg`, `recorded_at`) VALUES
(1, 4, 1, 4, 'Primary Stage-1 Hypertension with Dyslipidemia', 'Occasional morning occipital headache, mild dizziness on standing.', 'Clear bilateral breath sounds, regular S1/S2 rhythm, no peripheral edema.', '138/88', 76, 98.4, 78.50, DATE_SUB(NOW(), INTERVAL 1 DAY));

-- 7. SEED PRESCRIPTIONS
INSERT INTO `prescriptions` (`id`, `record_id`, `patient_id`, `doctor_id`, `medicine_name`, `dosage`, `frequency`, `duration`, `instructions`) VALUES
(1, 1, 4, 1, 'Telmisartan Tablets IP', '40 mg', 'Once daily (Morning)', '30 days', 'Take 30 minutes after breakfast with water.'),
(2, 1, 4, 1, 'Atorvastatin Tablets IP', '10 mg', 'Once daily (Night)', '30 days', 'Take after dinner. Avoid grapefruit juice.');

-- 8. SEED STAFF
INSERT INTO `staff` (`id`, `user_id`, `department_id`, `employee_code`, `name`, `designation`, `phone`, `email`, `shift`, `joining_date`, `is_active`) VALUES
(1, 6, 5, 'EMP-101', 'Meera Nair', 'Head Front-Desk Receptionist', '+91 98765 55555', 'receptionist@hospital.org', 'Morning', '2023-01-15', 1),
(2, NULL, 6, 'EMP-102', 'Senthil Nathan', 'Senior ER Triage Nurse', '+91 98765 66666', 'senthil.er@hospital.org', 'Rotational', '2022-06-01', 1),
(3, NULL, 1, 'EMP-103', 'Pooja Venkatesh', 'Cath-Lab Cardiac Technologist', '+91 98765 77777', 'pooja.cardio@hospital.org', 'Morning', '2023-09-10', 1);

-- 9. SEED BILLING
INSERT INTO `billing` (`id`, `invoice_number`, `patient_id`, `appointment_id`, `total_amount`, `discount_amount`, `tax_amount`, `net_amount`, `payment_status`, `invoice_date`, `due_date`, `notes`) VALUES
(1, 'INV-2026-0045', 4, 4, 1250.00, 50.00, 60.00, 1260.00, 'Paid', DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Doctor consultation fee + baseline ECG investigation.'),
(2, 'INV-2026-0046', 1, 1, 800.00, 0.00, 40.00, 840.00, 'Unpaid', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Outpatient consultation appointment token #1.');

-- 10. SEED PAYMENTS
INSERT INTO `payments` (`id`, `billing_id`, `transaction_reference`, `amount_paid`, `payment_method`, `payment_date`, `processed_by_user_id`) VALUES
(1, 1, 'TXN-UPI-20260904-883921', 1260.00, 'UPI', DATE_SUB(NOW(), INTERVAL 1 DAY), 6);
