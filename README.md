# 🐮 BovineMed: Cattle Doctor Management Platform

An enterprise tele-veterinary consultation and territorial cattle management platform built using **Node.js (Express)**, **FastAPI (Python)**, and **PostgreSQL**.

---

## 📋 Core Policy & Territorial Hierarchy

The system models a real-world livestock territorial health administration hierarchy:

```
[ E-Zone / Region ]  (e.g., Northern Dairy Belt)
       │
       ▼
[ Sub-Zone / Area ]  (e.g., River Valley Sector)
       │
       ▼
[ Farms / Firms ]    (e.g., Green Valley Dairy Firm)
       │
       ▼
[ Farmers & Cattle ] (Sub-zone Farmer submits cow issue)
       │
       ▼ (Audio + Picture + Symptoms + Weight + Size)
[ Assigned Doctor ]  (Veterinarian reviews auscultation, photo & issues prescription)
```

### Consultation Submission Policy
1. **Sub-Zone Farmer**:
   - Registers/selects cattle from their farm herd.
   - Submits cow **problem description & text symptoms**.
   - Uploads **cow picture** (lesion, mucosal inflammation, udder mastitis, wound).
   - Uploads **cow audio recording** (auscultation sound, breathing wheeze, grunting, cough).
   - Provides **cow weight (kg)** and **cow size (frame/measurements)** for dosage calculation.
2. **FastAPI Microservice**:
   - Performs acoustic analysis (peak amplitude, zero-crossing rate for wheezing, cough detection).
   - Inspects picture resolution and erythema/redness ratios.
   - Computes automated preliminary triage risk score.
3. **Assigned Veterinarian**:
   - Ticket routes to the doctor assigned to that specific Sub-Zone or E-Zone.
   - Doctor listens to the audio auscultation player and examines the photograph.
   - Doctor issues diagnosis, weight-calibrated medicine regimen, and farm management advice.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Key Responsibility |
| :--- | :--- | :--- |
| **Primary Backend API** | **Node.js (Express)** | Authentication (JWT), Zone/Sub-Zone/Firm hierarchy, Cattle registry, Consultation ticket routing, Multer file handling. |
| **Acoustic & Vision Microservice** | **FastAPI (Python 3.12)** | Asynchronous audio frequency & respiratory sound parsing, image quality & erythema inspection, pre-triage scoring. |
| **Database** | **PostgreSQL 16** | Relational schema with UUID keys, ENUMs, foreign key cascades, and JSONB prescription payloads. |
| **Web Dashboard UI** | **Modern Responsive HTML5 / CSS3 / ES6** | Interactive Sub-Zone Farmer portal, Doctor diagnostic workstation with audio player, and Territory Admin network viewer. |

---

## 🗄️ Database Schema Summary (`database/schema.sql`)

- `zones`: `id`, `code`, `name`, `description`
- `sub_zones`: `id`, `zone_id`, `code`, `name`
- `farms`: `id`, `sub_zone_id`, `name`, `registration_no`, `contact_phone`, `total_cattle_count`
- `users`: `id`, `full_name`, `email`, `role` (`FARMER`, `DOCTOR`, `ZONE_ADMIN`), `farm_id`
- `doctors`: `id`, `user_id`, `license_number`, `specialization`, `assigned_zone_id`, `assigned_sub_zone_id`
- `cattle`: `id`, `farm_id`, `tag_number`, `breed`, `weight_kg`, `size_category`
- `consultations`: `id`, `cattle_id`, `farmer_id`, `doctor_id`, `cow_weight_kg`, `cow_size`, `symptoms_text`, `status`, `fastapi_triage_score`
- `consultation_media`: `id`, `consultation_id`, `media_type` (`PICTURE`, `AUDIO`), `file_path`, `mime_type`
- `prescriptions`: `id`, `consultation_id`, `doctor_id`, `diagnosis`, `medications` (JSONB), `dietary_advice`

---

## 🚀 Quickstart Guide

### Option 1: Run with Docker Compose (Recommended)
From the project root:
```bash
docker-compose up --build
```
- **Web Dashboard & Node.js API**: `http://localhost:5000`
- **FastAPI Microservice & Swagger UI**: `http://localhost:8000/docs`
- **PostgreSQL**: `localhost:5432` (pre-seeded with sample zones, farms, and doctors)

---

### Option 2: Native Local Setup

#### 1. Start the FastAPI Microservice (Python)
```bash
cd service-fastapi
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
Open `http://localhost:8000/docs` to test audio & image endpoints.

#### 2. Start the Node.js Primary API & Dashboard
```bash
cd backend-node
npm install
npm start
```
Open `http://localhost:5000` in your web browser.

> **Zero-Config Fallback**: The Node.js backend includes an automatic in-memory mock repository populated with the complete seed dataset. If PostgreSQL is not yet running, the entire application boots seamlessly and functions right away!

---

## 📡 API Reference

### 1. Consultations
- `POST /api/consultations`: Submit problem ticket (multipart with `picture`, `audio`, `cow_weight_kg`, `cow_size`, `symptoms_text`).
- `GET /api/consultations`: List consultations (filter by `status`, `zone_id`, `sub_zone_id`, `doctor_id`).
- `GET /api/consultations/:id`: Retrieve full consultation with audio player URL and image link.
- `POST /api/consultations/:id/prescribe`: Doctor issues diagnosis and medication regimen.

### 2. Territory & Registry
- `GET /api/zones/tree/full`: Returns complete Zone ➔ Sub-Zone ➔ Farm hierarchy tree.
- `GET /api/cattle?farm_id=...`: Cattle registered under a farm.
- `GET /api/doctors/assigned-for-sub-zone/:subZoneId`: Resolves territorial doctor.
