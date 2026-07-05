# 🌱 ChamaBook

> Modern savings and loan management for SACCOs and Chamas.
>
> Replace the physical ledger with a secure, offline-capable web application built for African community savings groups.

![Go](https://img.shields.io/badge/Go-1.22-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Overview

ChamaBook is a full-stack platform designed to help SACCOs and informal savings groups manage their day-to-day operations digitally.

It supports member management, contributions, loans, meeting minutes, and reporting while remaining usable in environments with unreliable internet connectivity through offline-first technology.

---

## Features

- 👥 Member management
- 💰 Contributions tracking
- 🏦 Loan issuance & repayments
- 📝 Meeting minutes
- 📊 Dashboard & analytics
- 🔐 JWT Authentication
- 🌐 Progressive Web App (PWA)
- 📱 Offline support with automatic synchronization
- 🚀 REST API
- 🔄 Role-based access control

---

# Tech Stack

| Layer | Technology |
|--------|------------|
| Backend | Go, Gin, GORM |
| Frontend | React, Vite, Tailwind CSS |
| Database | PostgreSQL |
| Offline Storage | IndexedDB (Dexie.js) |
| Authentication | JWT |
| Deployment | Railway, Vercel |
| DevOps | Docker |

---

# Architecture

```
                  React PWA
                       │
               Axios + JWT API
                       │
               Gin REST Backend
                       │
                     GORM
                       │
                 PostgreSQL
```

Offline mode

```
User
 │
 ▼
IndexedDB (Dexie)
 │
 ▼
Sync Queue
 │
 ▼
Backend API
```

---

# Project Structure

```
chamabook
├── backend
│   ├── config
│   ├── handlers
│   ├── middleware
│   ├── models
│   ├── routes
│   └── main.go
│
└── frontend
    ├── src
    │   ├── components
    │   ├── context
    │   ├── db
    │   ├── hooks
    │   ├── pages
    │   └── services
    └── vite.config.js
```

---

# Getting Started

## Clone

```bash
git clone https://github.com/codebyoketch/Chama-Project.git

cd Chama-Project
```

---

## Backend

```bash
cd backend

cp .env.example .env

go mod tidy

go run main.go
```

Runs on

```
http://localhost:8080
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Runs on

```
http://localhost:5173
```

---

# API

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/v1/auth/register | Register group |
| POST | /api/v1/auth/login | Login |
| GET | /api/v1/dashboard | Dashboard |
| GET | /api/v1/members | Members |
| POST | /api/v1/members | Create member |
| GET | /api/v1/contributions | Contributions |
| POST | /api/v1/contributions | Add contribution |
| POST | /api/v1/contributions/sync | Offline sync |
| GET | /api/v1/loans | Loans |
| POST | /api/v1/loans | Create loan |
| POST | /api/v1/loans/repayment | Loan repayment |
| GET | /api/v1/minutes | Meeting minutes |
| POST | /api/v1/minutes | Record minutes |

---

# Offline Support

ChamaBook is designed to continue working without an internet connection.

Workflow:

```
Internet Available
        │
        ▼
Download latest data
        │
        ▼
Store locally (IndexedDB)
        │
Internet Lost
        │
        ▼
Continue working normally
        │
Queue all changes
        │
Internet Restored
        │
        ▼
Automatic synchronization
```

Duplicate submissions are prevented using a unique `client_temp_id`.

---

# Deployment

## Backend

- Railway
- Docker supported

## Frontend

- Vercel
- Any static hosting provider

---

# Roadmap

## Upcoming

- [ ] M-Pesa Daraja Integration
- [ ] Africa's Talking SMS Notifications
- [ ] PDF Reports
- [ ] Email Notifications
- [ ] Multi-group Support
- [ ] Audit Logs
- [ ] Docker Compose Production Deployment
- [ ] CI/CD with GitHub Actions

---

# Author

**Dishon Oketch**

Full-Stack & Backend Developer

- Portfolio: https://oketchlabs.space
- GitHub: https://github.com/codebyoketch
- LinkedIn: https://ke.linkedin.com/in/dishon-oketch-742011256

---

> *Building practical software for real communities.*