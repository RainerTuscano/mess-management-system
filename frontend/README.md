# NIT Goa Mess Management Frontend

Frontend scaffold for the hostel mess management app using React, Vite, Tailwind CSS, React Router, and Recharts.

## What is included

- Single login screen with role-based redirect
- Protected student and admin route groups
- Shared API client with bearer token support
- Student pages for today's meals, points history, meal history, and redemptions
- Admin pages for dashboard metrics, attendance chart, weekly menu display, and extras management

## Setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Set `VITE_API_BASE_URL` to the backend API base URL.
4. Install dependencies with `npm install`.
5. Start the app with `npm run dev`.

## Notes

- The current menu page is scaffolded for CRUD integration but does not yet include inline editing controls.
- The UI is already wired to the backend routes created in the `backend` folder, so the next pass can focus on runtime fixes and polish once dependencies are available.
