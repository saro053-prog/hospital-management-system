-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS) - RELATIONAL DATABASE SCHEMA
-- Engine: MySQL 8.0+ / MariaDB / SQLite Compatible
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `hospital_management_db`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `hospital_management_db`;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `billing`;
DROP TABLE IF EXISTS `prescriptions`;
DROP TABLE IF EXISTS `medical_records`;
DROP TABLE IF EXISTS `appointments`;
DROP TABLE IF EXISTS `staff`;
DROP TABLE IF EXISTS `doctors`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `patients`;
DROP TABLE IF EXISTS `users`;

-- ----------------------------------------------------------------------------
-- 1. USERS & AUTHENTICATION TABLE
-- Roles: admin, doctor, receptionist, patient
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'doctor', 'receptionist', 'patient') NOT NULL DEFAULT 'patient',
    `phone` VARCHAR(25),
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. DEPARTMENTS
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
-- 3. DOCTORS DIRECTORY
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
-- 4. PATIENTS REGISTRY
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
-- 5. APPOINTMENTS
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
    `status` ENUM('Scheduled', 'Completed', 'Cancelled', 'No-Show') NOT NULL DEFAULT 'Scheduled',
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
-- 6. MEDICAL RECORDS (EHR)
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

-- ----------------------------------------------------------------------------
-- 7. PRESCRIPTIONS
-- Medications prescribed by attending physicians
-- ----------------------------------------------------------------------------
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
-- 8. STAFF DIRECTORY
-- Administrative, nursing, and clinical support staff
-- ----------------------------------------------------------------------------
CREATE TABLE `staff` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `department_id` INT NULL,
    `employee_code` VARCHAR(30) NOT NULL UNIQUE,
    `name` VARCHAR(120) NOT NULL,
    `designation` VARCHAR(80) NOT NULL,
    `phone` VARCHAR(25) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `shift` ENUM('Morning', 'Evening', 'Night', 'Rotational') NOT NULL DEFAULT 'Morning',
    `joining_date` DATE NOT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 9. BILLING & INVOICES
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

-- ----------------------------------------------------------------------------
-- 10. PAYMENTS
-- Transaction logs for settled invoices
-- ----------------------------------------------------------------------------
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
