# NIT Goa Mess Management Backend

Backend scaffold for the hostel mess management app using Express, Prisma, PostgreSQL, JWT auth, and bcrypt.

## What is included

- Prisma schema for students, admins, menus, opt-outs, points, extras, redemptions, attendance, and meal ratings
- Seed script that generates roughly 1,200 students by default
- Auth route with JWT login
- Student routes for dashboard, opt-outs, redemptions, points history, meal history, and ratings
- Admin routes for dashboard, weekly menus, extras management, attendance, headcount, analytics, and manual points adjustment

## Setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env` and update values.
3. Install dependencies with `npm install`.
4. Generate Prisma client with `npm run prisma:generate`.
5. Run migrations with `npm run prisma:migrate`.
6. Seed mock data with `npm run prisma:seed`.
7. Start the server with `npm run dev`.

## Default seed credentials

- Admin username: `admin`
- Admin password: value of `DEFAULT_ADMIN_PASSWORD`
- Student password: value of `DEFAULT_STUDENT_PASSWORD`

## Assumptions

- Batch prefixes map directly from admission year, so 2024 students use roll numbers beginning with `24`
- The 2021 batch is still included in mock data by default; set `SEED_INCLUDE_2021="false"` if you want to exclude that batch
