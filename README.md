# Skylearner Technology

Website, admin panel and backend for Skylearner Technology.

Skylearner runs practical tech training for schools and colleges: AI and Machine Learning, Robotics, Web Development and App Development. Sessions are taught by working engineers, students build real projects, and each student pays Rs 200 per month for live sessions, notes, hackathons, a monthly exam and a certificate.

## Project structure

```
frontend/   website (index.html) and admin page (admin.html), plain HTML, no build step
backend/    Express API with SQLite storage for enrollments and contact messages
DEPLOY.md   step-by-step deployment guide (Render or a VPS, and Netlify for the frontend)
```

## Run locally

Requires Node.js 22.5 or newer.

```
cd backend
npm install
cp .env.example .env     # set ADMIN_KEY to a strong value
npm start
```

The API runs on http://localhost:5000. Open `frontend/index.html` in a browser to use the website. Before deploying, change `API_BASE` in both HTML files to your live backend URL.

## Main API routes

| Method | Route | Purpose |
|---|---|---|
| POST | /api/contact | Save a contact message |
| POST | /api/enroll | Register a student |
| GET | /api/admin/enrollments | List enrollments (admin key required) |
| GET | /api/admin/contacts | List contact messages (admin key required) |
| PATCH | /api/admin/enrollments/:id | Update enrollment status |

## Deployment

See [DEPLOY.md](./DEPLOY.md).

## Notes

- Secrets (`.env`) and the database file are never committed. See `.gitignore`.
- Payments are not connected yet. Fee status is tracked in the admin page.
