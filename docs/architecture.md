# Hospital Management System (HMS) - System Architecture

## 1. High-Level Architecture

The Hospital Management System follows a decoupled, three-tier enterprise web architecture consisting of a presentation layer, a business logic application layer, and a relational persistence layer.

```mermaid
graph TD
    Client["Client Browser / Mobile Web (HTML5, CSS3, Vanilla ES6+)"] -->|HTTP/REST JSON| ExpressApp["Node.js / Express Application Server"]
    ExpressApp -->|Auth Guards & RBAC| Middleware["JWT & Role Authorization Layer"]
    Middleware -->|Controllers & Services| BusinessLogic["Business Logic Layer\n(Patients, Doctors, Appointments, Records, Billing)"]
    BusinessLogic -->|mysql2/promise Pool| MySQL[("MySQL 8.0+ Relational Database")]
    BusinessLogic -.->|Zero-Downtime Fallback| FallbackStore[("In-Memory Relational Engine")]
```

---

## 2. Entity-Relationship (ER) Model

```mermaid
erDiagram
    USERS ||--o{ DOCTORS : "associated_with"
    USERS ||--o{ PATIENTS : "registers"
    USERS ||--o{ STAFF : "associated_with"
    DEPARTMENTS ||--o{ DOCTORS : "houses"
    DEPARTMENTS ||--o{ APPOINTMENTS : "categorizes"
    PATIENTS ||--o{ APPOINTMENTS : "books"
    DOCTORS ||--o{ APPOINTMENTS : "attends"
    PATIENTS ||--o{ MEDICAL_RECORDS : "has"
    DOCTORS ||--o{ MEDICAL_RECORDS : "creates"
    MEDICAL_RECORDS ||--o{ PRESCRIPTIONS : "contains"
    PATIENTS ||--o{ BILLING : "invoiced_for"
    BILLING ||--o{ PAYMENTS : "settled_by"

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string role
        string phone
    }

    DEPARTMENTS {
        int id PK
        string name UK
        string code UK
        string floor_location
    }

    DOCTORS {
        int id PK
        int department_id FK
        string name
        string specialization
        decimal consultation_fee
        boolean is_available
    }

    PATIENTS {
        int id PK
        string patient_code UK
        string name
        date dob
        string blood_group
        string phone
        string insurance_provider
    }

    APPOINTMENTS {
        int id PK
        string appointment_number UK
        int patient_id FK
        int doctor_id FK
        date appointment_date
        time appointment_time
        string status
    }

    MEDICAL_RECORDS {
        int id PK
        int patient_id FK
        int doctor_id FK
        string diagnosis
        string symptoms
        string blood_pressure
    }

    BILLING {
        int id PK
        string invoice_number UK
        int patient_id FK
        decimal total_amount
        decimal net_amount
        string payment_status
    }
```

---

## 3. Role-Based Access Control (RBAC) Matrix

| Module / Action | Admin | Doctor | Receptionist | Patient |
|---|:---:|:---:|:---:|:---:|
| **Dashboard Metrics & Analytics** | Full View | Clinical Only | Operational | Personal Only |
| **Register New Patient** | Yes | Yes | Yes | Self |
| **View Patient Medical Records** | Yes | Yes | No | Self Only |
| **Prescribe Medications** | No | Yes | No | No |
| **Schedule Appointments** | Yes | Yes | Yes | Self |
| **Manage Billing & Invoices** | Full Access | View Only | Create / Settle | Pay / View |
| **Staff & Doctor Directory** | Full CRUD | View | View | View |

---

## 4. Security & Fault-Tolerance Considerations

1. **Stateless JWT Authentication**: Tokens expire automatically after 24 hours and contain digitally signed role claims.
2. **Password Security**: Implements `bcryptjs` with cost factor 10 to protect credentials against dictionary attacks.
3. **Resilient Data Access**: Built-in fallback ensures zero application crashes even if external database connections experience transient latency.
