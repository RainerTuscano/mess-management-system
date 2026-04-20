# NIT Goa Mess Management

NIT Goa Mess Management is a full-stack hostel mess operations platform that helps students manage meal opt-outs, points, and extra-item redemptions while giving administrators a clean dashboard for menus, attendance, headcount, redeemables, and token fulfillment.

## Tech Stack

| Layer | Stack |
| --- | --- |
| Frontend | React + Tailwind + Recharts + Vite |
| Backend | Node.js + Express + Prisma + JWT |
| Database | PostgreSQL |
| Deploy | Vercel + Railway |

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL running locally

### Backend

1. `cd backend`
2. `cp .env.example .env`
3. Fill in `DATABASE_URL` and `JWT_SECRET`
4. `npm install`
5. `npx prisma migrate dev --name init`
6. `npm run prisma:seed`
7. `npm run dev`

### Frontend

1. `cd frontend`
2. `cp .env.example .env`
3. Set `VITE_API_BASE_URL` to `http://localhost:4000/api`
4. `npm install`
5. `npm run dev`

## Default Credentials

| Role | Identifier | Password |
| --- | --- | --- |
| Admin | admin | (value of DEFAULT_ADMIN_PASSWORD in .env) |
| Student | 22cse1001 | (value of DEFAULT_STUDENT_PASSWORD in .env) |

## Deployment

### Backend (Railway)

- Create a new Railway project
- Add a PostgreSQL plugin
- Set all env vars from `.env.example`
- Deploy - Railway uses `railway.json` automatically
- After deploy run: `npx prisma migrate deploy`, then `npm run prisma:seed`

### Frontend (Vercel)

- Connect the repo to Vercel
- Set root directory to `frontend/`
- Add env var: `VITE_API_BASE_URL` = your Railway backend URL + `/api`
- Deploy - Vercel uses `vercel.json` automatically

## Features

Student features:

- View upcoming and past mess meals with opt-out and attendance status
- Rate past meals and track points earned or spent
- Redeem extra items and show active counter tokens

Admin features:

- Manage weekly menus, extra redeemables, and operational dashboards
- Track attendance, headcount, and recent activity across meals
- View active redemption tokens and mark them fulfilled at the counter
