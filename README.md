# 🌱 ChamaBook

Digital savings management for SACCOs and chamas — replacing the physical book.

## Tech Stack
- **Backend**: Go + Gin + GORM + PostgreSQL
- **Frontend**: React + Vite (PWA — works offline!)
- **Offline**: Dexie.js (IndexedDB) + Service Worker
- **Auth**: JWT

---

## Project Structure

```
chamabook/
├── backend/
│   ├── main.go
│   ├── go.mod
│   ├── .env.example        ← copy to .env and fill in values
│   ├── config/
│   │   └── database.go     ← DB connection + connection pool
│   ├── models/
│   │   └── models.go       ← all database models
│   ├── handlers/
│   │   ├── auth.go         ← register, login
│   │   ├── members.go      ← member CRUD
│   │   ├── contributions.go
│   │   ├── loans.go
│   │   └── dashboard.go    ← stats + minutes
│   ├── middleware/
│   │   └── auth.go         ← JWT auth + role check
│   └── routes/
│       └── routes.go       ← all API routes
└── frontend/
    ├── package.json
    ├── vite.config.js      ← PWA config
    └── src/
        ├── App.jsx
        ├── context/
        │   └── AuthContext.jsx   ← global auth state
        ├── db/
        │   └── localDB.js        ← Dexie offline database
        ├── services/
        │   ├── api.js            ← Axios with JWT
        │   └── sync.js           ← offline → online sync
        ├── hooks/
        │   └── useOnlineStatus.js
        ├── components/
        │   └── Layout.jsx
        └── pages/
            ├── Dashboard.jsx
            ├── Members.jsx
            ├── Contributions.jsx  ← has offline support
            ├── Loans.jsx
            └── Minutes.jsx
```

---

## Getting Started

### 1. Backend

```bash
cd backend

# Copy env file and fill in your values
cp .env.example .env

# Install dependencies
go mod tidy

# Run (make sure PostgreSQL is running)
go run main.go
```

The API will start at `http://localhost:8080`

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will open at `http://localhost:5173`

---

## API Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | /api/v1/auth/register | Create group + admin | Public |
| POST | /api/v1/auth/login | Login | Public |
| GET | /api/v1/dashboard | Stats overview | Required |
| GET | /api/v1/members | List members | Required |
| POST | /api/v1/members | Add member | Admin |
| GET | /api/v1/contributions | List contributions | Required |
| POST | /api/v1/contributions | Record contribution | Admin |
| POST | /api/v1/contributions/sync | Bulk offline sync | Admin |
| GET | /api/v1/loans | List loans | Required |
| POST | /api/v1/loans | Issue loan | Admin |
| POST | /api/v1/loans/repayment | Record repayment | Admin |
| GET | /api/v1/minutes | List minutes | Required |
| POST | /api/v1/minutes | Add minutes | Required |

---

## Offline Support

How it works:
1. App loads → caches all data in IndexedDB (Dexie)
2. Internet drops → app shows offline banner
3. Treasurer records contributions/loans → saved to IndexedDB + sync queue
4. Internet returns → sync runs automatically, sends all queued records to backend
5. Conflicts are avoided using `client_temp_id` to deduplicate

---

## Deployment

**Backend → Railway**
1. Push to GitHub
2. Connect repo to Railway
3. Add environment variables from .env
4. Deploy

**Frontend → Vercel**
1. Push frontend folder to GitHub
2. Connect to Vercel
3. Set `VITE_API_URL` if needed
4. Deploy

---

## Phase 2 (after submission)
- [ ] M-Pesa Daraja API integration
- [ ] SMS notifications (Africa's Talking)
- [ ] PDF report generation
- [ ] Freemium billing system
- [ ] Multi-group support
