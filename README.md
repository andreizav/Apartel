# Apartel PMS

Property Management System for apartels and short-term rentals (Angular 21, standalone, zoneless).



## Run Locally

**Prerequisites:** Node.js

Data is stored only on the server (no localStorage). You must run the API.

1. **Backend:** `cd server`, then `npm install` and `npm start` (or from project root: `npm run server` after installing deps in `server/` once). API runs at **http://localhost:4000**. Set `PORT`, `JWT_SECRET`, and `CORS_ORIGIN` in `server/.env` (see `server/.env.example`).
2. **Frontend:** In project root run `npm install`, then `npm run dev`. Open http://localhost:3000.
3. **Login:** Use `alice@demo.com` (demo user from server seed). If you have a valid token in storage, the app restores the session on load.

Set `apiUrl` in [src/environments/environment.ts](src/environments/environment.ts) (default `http://localhost:4000`). For production use [environment.prod.ts](src/environments/environment.prod.ts) and set your backend URL.

## Security

- Never commit `.env` or `.env.local` or real API keys (see [.gitignore](.gitignore)).
- Authentication and secrets are handled by the backend; the frontend stores only the JWT in localStorage.

## API (Node.js)

The `server/` app provides: `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/bootstrap` (Bearer), `GET/PUT /api/portfolio`, `DELETE /api/portfolio/units/:id`, `GET/POST /api/bookings`, `GET/POST/PATCH/DELETE /api/clients`, `GET/POST/PATCH/DELETE /api/staff`, `GET/POST /api/transactions`, `GET/PUT /api/inventory`, `GET/PUT /api/channels/mappings|ical|ota`, `POST /api/channels/sync`, `GET/PUT /api/settings`, `GET/PATCH /api/tenants/me`.
