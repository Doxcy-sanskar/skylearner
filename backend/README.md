# Skylearner backend

Express API for the website. Handles the contact form, student enrollments, and an admin list.
Data is stored in a SQLite database (built into Node 22.5+, no extra install).

## Run locally

```
npm install
cp .env.example .env     # then set ADMIN_KEY
npm start
```

Runs on port 5000 by default. The database file is created automatically at `data/skylearner.db`.

## Routes

| Method | Route | What it does |
|---|---|---|
| POST | /api/contact | Saves a contact form message |
| POST | /api/enroll | Registers a student (Rs 200/month) |
| GET | /api/admin/enrollments | List enrollments (needs `x-admin-key` header) |
| GET | /api/admin/contacts | List contact messages (needs `x-admin-key` header) |
| PATCH | /api/admin/enrollments/:id | Change status to pending, active, paused or completed |

## Environment variables

| Name | Purpose |
|---|---|
| ADMIN_KEY | Key for admin routes and admin.html |
| FRONTEND_URL | Website address allowed to call the API (CORS) |
| DB_FILE | Path of the SQLite file. Use a persistent disk path on a host |
| PORT | Port to listen on (default 5000) |

See DEPLOY.md in the parent folder for deployment steps.
