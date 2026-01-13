# Aixos FireFighter Marketplace

A comprehensive Fire Safety Marketplace connecting Agents, Customers, and Administrators. This platform manages the entire lifecycle of fire safety equipment, from inspection and inventory logging to service booking and compliance tracking.

## 🚀 Key Features

### 1. Agent Portal (`/agent`)
- **Digital Onboarding**: Agents can register and upload documents (CNIC, Profile).
- **Visit Logging 2.0**: A wizard-style interface to log customer visits, risk assessments, and inventory.
- **Territory Map**: Interactive map showing assigned customers.
- **My Customers**: CRM to manage detailed client portfolios.

### 2. Customer Portal (`/customer`)
- **Asset Inventory**: View all fire safety equipment (Extinguishers) with status (Valid/Expired).
- **Service Booking**: Book inspections, refills, or new installations. Includes an "Asset Picker" for targeted service.
- **Tracking Timeline**: Visual progress bar for active service requests.
- **Digital Certificates**: Download PDF compliance certificates for valid equipment.

### 3. Admin Portal (`/admin`)
- **Command Center**: High-level dashboard with Revenue and Growth analytics.
- **Territory Management**: "God Mode" Global Map viewing all Agents and Customers.
- **Service Queue**: Global list of incoming requests with Agent Assignment capabilities.
- **Customer Database**: Searchable registry of all businesses.
- **Agent Approval**: Workflow to reviewing and approving pending agents.

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Backend Setup
The backend runs on Node.js/Express with SQLite.

```bash
cd backend
npm install
npm run dev
```
*Server will start on `http://localhost:5000`*

### 2. Frontend Setup
The frontend is built with React + Vite + TailwindCSS.

```bash
cd frontend
npm install
npm run dev
```
*App will start on `http://localhost:5173`*

---

## 🔐 Login Credentials (Seed Data)

### **Super Admin**
- **Email**: `admin@tradmak.com`
- **Password**: `admin@tradmak.com`
- **Role**: Full access to Admin Portal.

### **Demo Agent**
- **Email**: `agent@aixos.com` (Register a new one to test onboarding)
- **Password**: `password123`

### **Demo Customer**
- **Email**: `customer@business.com` (Created via Agent Visit log)
- **Password**: `default` (or as set during registration)

---

## 🧪 How to Test the "Full Loop"

1.  **Agent Action**:
    - Login as **Agent**.
    - Go to **Log Visit**.
    - Create a new "Lead" (Customer) and add some Extinguishers to their inventory.

2.  **Customer Action**:
    - Login as the **Customer** you just created.
    - Go to **Inventory** to see the items the agent added.
    - Go to **Book Service** -> Select "Refilling".
    - Pick an expired extinguisher and Confirm Booking.

3.  **Admin Action**:
    - Login as **Admin**.
    - Go to **Service Queue** (`/admin/services`).
    - See the new "Refilling" request.
    - **Assign** it to the Agent.

4.  **Verification**:
    - Customer goes to **History** and sees the status change to "Scheduled".

---

## 📂 Project Structure

- `frontend/`: React Application
    - `src/pages/agent`: Agent-specific workflows.
    - `src/pages/customer`: Customer self-service portals.
    - `src/pages/admin`: Management dashboards.
- `backend/`: Express Server
    - `db.js`: SQLite schema definition.
    - `routes/`: API endpoints separated by role.
    - `database.sqlite`: Local file-based DB.

---

## 📝 Technologies Used
- **Frontend**: React, Tailwind CSS v4, Lucide Icons, Recharts, React-Leaflet.
- **Backend**: Node.js, Express, SQLite, BCrypt, Multer.
- **Design**: Modern, clean aesthetic with glassmorphism and soft shadows.
