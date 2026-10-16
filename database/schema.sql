-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS) - RELATIONAL DATABASE SCHEMA
-- Engine: MySQL 8.0+ / MariaDB Compatible
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `hospital_management_db`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `hospital_management_db`;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `billing`;
DROP TABLE IF EXISTS `prescriptions`;
DROP TABLE IF EXISTS `medical_records`;
DROP TABLE IF EXISTS `nurse_vitals`;
DROP TABLE IF EXISTS `lab_orders`;
DROP TABLE IF EXISTS `lab_tests`;
DROP TABLE IF EXISTS `medicines`;
DROP TABLE IF EXISTS `beds`;
DROP TABLE IF EXISTS `wards`;
DROP TABLE IF EXISTS `appointments`;
DROP TABLE IF EXISTS `nurses`;
DROP TABLE IF EXISTS `staff`;
DROP TABLE IF EXISTS `doctors`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `patients`;
DROP TABLE IF EXISTS `password_resets`;
DROP TABLE IF EXISTS `users`;

-- ----------------------------------------------------------------------------
-- 1. USERS & AUTHENTICATION TABLE
-- Roles: admin, doctor, nurse, receptionist, lab_staff, patient
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'doctor', 'nurse', 'receptionist', 'lab_staff', 'patient') NOT NULL DEFAULT 'patient',
    `phone` VARCHAR(25),
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. PASSWORD RESETS
-- Secure time-limited tokens for password recovery
-- ----------------------------------------------------------------------------
CREATE TABLE `password_resets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(150) NOT NULL,
    `token` VARCHAR(100) NOT NULL,
    `expires_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_reset_token` (`token`),
    INDEX `idx_reset_email` (`email`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. DEPARTMENTS
-- Hospital clinical & surgical specialties
-- ----------------------------------------------------------------------------
CREATE TABLE `departments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `description` TEXT,
    `floor_location` VARCHAR(50),
    `phone_extension` VARCHAR(20),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. DOCTORS DIRECTORY
-- Profiles, medical license, specialization, shift timings
-- ----------------------------------------------------------------------------
CREATE TABLE `doctors` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `department_id` INT NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `specialization` VARCHAR(120) NOT NULL,
    `qualification` VARCHAR(100) NOT NULL,
    `license_number` VARCHAR(50) NOT NULL UNIQUE,
    `phone` VARCHAR(25) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `consultation_fee` DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    `room_number` VARCHAR(30),
    `availability_days` VARCHAR(100) DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    `shift_start` TIME DEFAULT '09:00:00',
    `shift_end` TIME DEFAULT '17:00:00',
    `is_available` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT,
    INDEX `idx_doctors_department` (`department_id`),
    INDEX `idx_doctors_availability` (`is_available`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. NURSES
-- Nursing staff profiles and duty assignments
-- ----------------------------------------------------------------------------
CREATE TABLE `nurses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `department_id` INT NULL,
    `name` VARCHAR(120) NOT NULL,
    `qualification` VARCHAR(100) NOT NULL,
    `license_number` VARCHAR(50) NOT NULL UNIQUE,
    `phone` VARCHAR(25) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `shift` ENUM('Morning', 'Evening', 'Night', 'Rotational') NOT NULL DEFAULT 'Morning',
    `assigned_ward` VARCHAR(60) DEFAULT 'General Ward',
    `is_on_duty` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. PATIENTS REGISTRY
-- Demographics, contact info, medical emergency notes
-- ----------------------------------------------------------------------------
CREATE TABLE `patients` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `patient_code` VARCHAR(30) NOT NULL UNIQUE,
    `name` VARCHAR(120) NOT NULL,
    `dob` DATE NOT NULL,
    `gender` ENUM('Male', 'Female', 'Other') NOT NULL,
    `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-') NOT NULL,
    `phone` VARCHAR(25) NOT NULL,
    `email` VARCHAR(150),
    `address` TEXT NOT NULL,
    `city` VARCHAR(80) NOT NULL,
    `emergency_contact_name` VARCHAR(100),
    `emergency_contact_phone` VARCHAR(25),
    `known_allergies` TEXT,
    `insurance_provider` VARCHAR(100),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    INDEX `idx_patient_code` (`patient_code`),
    INDEX `idx_patient_phone` (`phone`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. APPOINTMENTS
-- Booking schedule, slot allocation, status triage
-- ----------------------------------------------------------------------------
CREATE TABLE `appointments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `appointment_number` VARCHAR(40) NOT NULL UNIQUE,
    `patient_id` INT NOT NULL,
    `doctor_id` INT NOT NULL,
    `department_id` INT NOT NULL,
    `appointment_date` DATE NOT NULL,
    `appointment_time` TIME NOT NULL,
    `token_number` INT NOT NULL DEFAULT 1,
    `reason` VARCHAR(255) NOT NULL,
    `status` ENUM('Scheduled', 'Confirmed', 'In Consultation', 'Completed', 'Cancelled', 'No-Show') NOT NULL DEFAULT 'Scheduled',
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE,
    INDEX `idx_appointment_date` (`appointment_date`),
    INDEX `idx_appointment_status` (`status`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. WARDS & BEDS
-- Hospital bed capacity and occupancy matrix
-- ----------------------------------------------------------------------------
CREATE TABLE `wards` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(80) NOT NULL UNIQUE,
    `type` ENUM('General', 'ICU', 'CCU', 'Pediatric', 'Post-Op', 'Maternity') NOT NULL DEFAULT 'General',
    `floor_location` VARCHAR(50) NOT NULL,
    `total_beds` INT NOT NULL DEFAULT 10,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `beds` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ward_id` INT NOT NULL,
    `bed_number` VARCHAR(20) NOT NULL UNIQUE,
    `status` ENUM('Available', 'Occupied', 'Reserved', 'Maintenance') NOT NULL DEFAULT 'Available',
    `patient_id` INT NULL,
    `assigned_at` TIMESTAMP NULL,
    `daily_rate` DECIMAL(10, 2) NOT NULL DEFAULT 1500.00,
    FOREIGN KEY (`ward_id`) REFERENCES `wards`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 9. MEDICAL RECORDS (EHR) & NURSE VITALS
-- Clinical diagnosis, examinations, vital telemetry
-- ----------------------------------------------------------------------------
CREATE TABLE `medical_records` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `doctor_id` INT NOT NULL,
    `appointment_id` INT NULL,
    `diagnosis` VARCHAR(255) NOT NULL,
    `symptoms` TEXT NOT NULL,
    `examination_notes` TEXT,
    `blood_pressure` VARCHAR(20),
    `heart_rate_bpm` INT,
    `temperature_f` DECIMAL(4, 1),
    `weight_kg` DECIMAL(5, 2),
    `recorded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL,
    INDEX `idx_records_patient` (`patient_id`)
) ENGINE=InnoDB;

CREATE TABLE `nurse_vitals` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `nurse_id` INT NULL,
    `blood_pressure` VARCHAR(20) NOT NULL,
    `heart_rate_bpm` INT NOT NULL,
    `temperature_f` DECIMAL(4, 1) NOT NULL,
    `sp_o2_percent` INT NOT NULL DEFAULT 98,
    `respiratory_rate` INT NOT NULL DEFAULT 16,
    `notes` VARCHAR(255),
    `recorded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`nurse_id`) REFERENCES `nurses`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 10. PRESCRIPTIONS & PHARMACY MEDICINES
-- Medications prescribed and dispensing inventory
-- ----------------------------------------------------------------------------
CREATE TABLE `medicines` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `generic_name` VARCHAR(150) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `strength` VARCHAR(50) NOT NULL,
    `dosage_form` VARCHAR(50) NOT NULL DEFAULT 'Tablet',
    `stock_quantity` INT NOT NULL DEFAULT 100,
    `unit_price` DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    `reorder_level` INT NOT NULL DEFAULT 20,
    `expiry_date` DATE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE `prescriptions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `record_id` INT NOT NULL,
    `patient_id` INT NOT NULL,
    `doctor_id` INT NOT NULL,
    `medicine_name` VARCHAR(150) NOT NULL,
    `dosage` VARCHAR(50) NOT NULL,
    `frequency` VARCHAR(80) NOT NULL,
    `duration` VARCHAR(50) NOT NULL,
    `instructions` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`record_id`) REFERENCES `medical_records`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 11. LABORATORY CATALOG & ORDERS
-- Test orders, sample collection, verification and reports
-- ----------------------------------------------------------------------------
CREATE TABLE `lab_tests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `test_code` VARCHAR(20) NOT NULL UNIQUE,
    `test_name` VARCHAR(120) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `specimen` VARCHAR(60) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 350.00,
    `reference_range` VARCHAR(150),
    `turnaround_hours` INT NOT NULL DEFAULT 24
) ENGINE=InnoDB;

CREATE TABLE `lab_orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_code` VARCHAR(40) NOT NULL UNIQUE,
    `patient_id` INT NOT NULL,
    `doctor_id` INT NOT NULL,
    `test_id` INT NOT NULL,
    `status` ENUM('Requested', 'Sample Collected', 'Processing', 'Completed', 'Verified') NOT NULL DEFAULT 'Requested',
    `results` TEXT,
    `technician_name` VARCHAR(100),
    `verified_by` VARCHAR(100),
    `ordered_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `completed_at` TIMESTAMP NULL,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`test_id`) REFERENCES `lab_tests`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 12. BILLING & PAYMENTS
-- Outpatient / inpatient charges, discounts, taxes
-- ----------------------------------------------------------------------------
CREATE TABLE `billing` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `invoice_number` VARCHAR(40) NOT NULL UNIQUE,
    `patient_id` INT NOT NULL,
    `appointment_id` INT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `discount_amount` DECIMAL(10, 2) DEFAULT 0.00,
    `tax_amount` DECIMAL(10, 2) DEFAULT 0.00,
    `net_amount` DECIMAL(10, 2) NOT NULL,
    `payment_status` ENUM('Unpaid', 'Partially Paid', 'Paid') NOT NULL DEFAULT 'Unpaid',
    `invoice_date` DATE NOT NULL,
    `due_date` DATE NOT NULL,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL,
    INDEX `idx_billing_patient` (`patient_id`),
    INDEX `idx_billing_status` (`payment_status`)
) ENGINE=InnoDB;

CREATE TABLE `payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `billing_id` INT NOT NULL,
    `transaction_reference` VARCHAR(80) NOT NULL UNIQUE,
    `amount_paid` DECIMAL(10, 2) NOT NULL,
    `payment_method` ENUM('Cash', 'Credit Card', 'Debit Card', 'UPI', 'Insurance') NOT NULL,
    `payment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `processed_by_user_id` INT NULL,
    FOREIGN KEY (`billing_id`) REFERENCES `billing`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`processed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 13. NOTIFICATIONS
-- Real-time user & role alerts
-- ----------------------------------------------------------------------------
CREATE TABLE `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `role` VARCHAR(50) NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `type` ENUM('info', 'success', 'warning', 'danger') NOT NULL DEFAULT 'info',
    `is_read` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
