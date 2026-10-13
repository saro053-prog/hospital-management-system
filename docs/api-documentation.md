# Hospital Management System (HMS) - REST API Reference

Base URL: `http://localhost:5000/api`

All protected endpoints require an `Authorization` HTTP header:
`Authorization: Bearer <your_jwt_token>`

---

## 1. Authentication (`/api/auth`)

### POST `/login`
Authenticates a user and issues a JWT token.
- **Request Body**:
  ```json
  {
    "email": "admin@hospital.org",
    "password": "Password@123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Dr. Robert Vance",
      "email": "admin@hospital.org",
      "role": "admin"
    }
  }
  ```

### GET `/me`
Returns current authenticated user profile.

### GET `/demo-accounts`
Returns available pre-configured demo user accounts for rapid testing.

---

## 2. Patients (`/api/patients`)

### GET `/`
List all registered patients.
- **Query Parameters**:
  - `search` *(optional)*: Filter by patient name, code, phone, or blood group.

### GET `/:id`
Retrieves single patient details including past appointments, EHR records, and billing ledger.

### POST `/`
Registers a new patient.
- **Request Body**:
  ```json
  {
    "name": "Ramesh Kumar",
    "dob": "1990-05-12",
    "gender": "Male",
    "blood_group": "O+",
    "phone": "+91 98401 55555",
    "email": "ramesh@example.com",
    "address": "45 Lake View Road",
    "city": "Chennai",
    "emergency_contact_name": "Sita Kumar",
    "emergency_contact_phone": "+91 98401 66666",
    "known_allergies": "Penicillin",
    "insurance_provider": "Star Health"
  }
  ```

---

## 3. Doctors & Departments (`/api/doctors`)

### GET `/`
Returns all consulting physicians.
- **Query Parameters**:
  - `department_id` *(optional)*: Filter by clinical department.

### GET `/departments`
Returns all medical specialty departments.

---

## 4. Appointments (`/api/appointments`)

### GET `/`
Returns all appointment records.
- **Query Parameters**:
  - `status` *(optional)*: `Scheduled`, `Completed`, `Cancelled`.
  - `date` *(optional)*: `YYYY-MM-DD`.

### POST `/`
Schedules a new outpatient appointment.
- **Request Body**:
  ```json
  {
    "patient_id": 1,
    "doctor_id": 1,
    "department_id": 1,
    "appointment_date": "2026-10-15",
    "appointment_time": "10:30:00",
    "reason": "Cardiovascular consultation"
  }
  ```

### PUT `/:id/status`
Updates status of an appointment.
- **Request Body**:
  ```json
  {
    "status": "Completed"
  }
  ```

---

## 5. Medical Records & EHR (`/api/records`)

### GET `/`
Returns all clinical electronic health records.

### POST `/`
Creates a medical examination note and attaches digital prescriptions.

---

## 6. Billing (`/api/billing`)

### GET `/`
Returns hospital outpatient invoices.

### POST `/:id/pay`
Records payment for an outstanding invoice.
- **Request Body**:
  ```json
  {
    "payment_method": "UPI",
    "amount_paid": 840.00
  }
  ```

---

## 7. Analytics (`/api/stats`)

### GET `/dashboard`
Aggregates hospital clinical and operational metrics for the executive dashboard.
