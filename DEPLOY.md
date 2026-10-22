# Skylearner: deploy guide

This folder has three parts:

- `frontend/` : website (`index.html`) and admin page (`admin.html`). Plain HTML, no build step.
- `backend/`  : Node.js + Express API. Stores data in a SQLite database file.
- Database    : `backend/data/skylearner.db`, created automatically on first run. Tables: `enrollments`, `contacts`.

Order: deploy the backend first, then point the frontend at it.

---

## 0. Before you deploy

1. Make the admin key strong. Use a long random value, not `sanskar@123`.
2. Put the same key in the backend's environment variables (step 2 below).
3. Keep `.env` out of GitHub. The `.gitignore` in `backend/` already does this.

---

## 1. Put the backend on GitHub

1. Create a new **private** repository on GitHub, e.g. `skylearner-backend`.
2. Upload the contents of the `backend/` folder to it, **without** `node_modules`, `data`, or `.env`.

---

## 2. Deploy the backend on Render

Render is simple for Node apps. Its free tier does **not** keep files between restarts, so use a paid instance that has a persistent disk (the Starter plan or higher).

1. Go to render.com, sign in with GitHub, and click **New > Web Service**.
2. Select the `skylearner-backend` repository.
3. Fill in:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. Under **Environment**, add:
   - `ADMIN_KEY` = your strong admin key
   - `FRONTEND_URL` = your website URL, e.g. `https://skylearner.in` (no trailing slash)
   - `DB_FILE` = `/var/data/skylearner.db`
   - `NODE_VERSION` = `22.12.0` (the app needs Node 22.5 or newer)
5. Under **Disks**, add a disk:
   - **Mount path:** `/var/data`
   - **Size:** 1 GB is enough for the pilot
6. Click **Create Web Service** and wait for the deploy to finish.
7. Open `https://<your-service>.onrender.com/` in the browser. You should see "Skylearner backend is running".
8. Open `https://<your-service>.onrender.com/api/admin/enrollments` with the header `x-admin-key`. Checking this with `curl` is easiest:

```
curl https://<your-service>.onrender.com/api/admin/enrollments -H "x-admin-key: YOUR_KEY"
```

It should return `[]` on a fresh database.

---

## 3. Point the frontend at the backend

Open `frontend/index.html` and `frontend/admin.html` in a text editor. Find this line in each file:

```js
const API_BASE = "http://localhost:5000";
```

Change it to your live backend URL:

```js
const API_BASE = "https://<your-service>.onrender.com";
```

Do this in both files. Save them.

---

## 4. Deploy the frontend on Netlify

1. Go to app.netlify.com/drop.
2. Drag the `frontend/` folder onto the page.
3. Netlify gives you a free link like `https://something.netlify.app`. The site is live.
4. Optional: in Netlify, go to **Domain settings** and add your own domain, e.g. `skylearner.in`. Buy the domain from any registrar, then follow Netlify's DNS steps.
5. Go back to Render and set `FRONTEND_URL` to the final website address, so the browser is allowed to call the API.

The admin page is at `https://<your-site>/admin.html`. It is not linked from the website, but anyone with the URL can open it. Only the admin key protects the data.

---

## 5. Test the live site

1. Open the website. Submit the enrollment form with a test name and number.
2. Submit the contact form.
3. Open `/admin.html`, enter the admin key, and click **Load data**. Your test entries should appear.
4. Change a status with the dropdown. Reload the page and confirm it stayed changed.
5. Delete the test rows before you start real enrollments. Use the admin page or the database.

---

## Alternative: a VPS (Ubuntu server)

Use this if you already have a server, e.g. from DigitalOcean, Hostinger, or AWS Lightsail.

```
# on the server
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# copy the backend folder to /var/www/skylearner-backend, then:
cd /var/www/skylearner-backend
cp .env.example .env        # edit ADMIN_KEY, FRONTEND_URL, DB_FILE
npm install
pm2 start server.js --name skylearner-api
pm2 save && pm2 startup
```

Then point nginx at the app. Create `/etc/nginx/sites-available/skylearner-api`:

```
server {
    server_name api.skylearner.in;
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }
}
```

Enable it and get HTTPS:

```
sudo ln -s /etc/nginx/sites-available/skylearner-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.skylearner.in
```

Use `https://api.skylearner.in` as `API_BASE`. Back up `data/skylearner.db` regularly, e.g. with a daily cron job that copies it to another location.

---

## Backups and limits

- The SQLite file is the database. Copy it somewhere safe every week. On Render, you can download it from the shell.
- SQLite is fine for the pilot (a few thousand students). Once you grow, move to a managed PostgreSQL database. This needs small code changes in `server.js`, so ask when you get there.
- Payments are not connected. Fee status is tracked manually with the admin page. Add Razorpay or Cashfree later if you want online payment.
- Keep the admin key private. Anyone who has it can read every student's phone number and email.
