const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-this-key";
const MONTHLY_FEE = 200;
const TRACKS = ["AI & Machine Learning", "Robotics", "Web Development", "App Development"];
const STATUSES = ["pending", "active", "paused", "completed"];

// database file. on a host, point DB_FILE to a persistent disk path
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "data", "skylearner.db");
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec(`
  CREATE TABLE IF NOT EXISTS enrollments (
    id           TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    institution  TEXT,
    class_name   TEXT,
    phone        TEXT NOT NULL,
    email        TEXT,
    track        TEXT NOT NULL,
    monthly_fee  INTEGER NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TEXT NOT NULL,
    updated_at   TEXT
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    phone      TEXT,
    message    TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_enroll_phone_track ON enrollments (phone, track);
`);

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function validPhone(p) {
  // indian mobile, 10 digits, starts with 6-9
  return /^[6-9]\d{9}$/.test(p);
}

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function checkAdmin(req, res, next) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "not allowed" });
  }
  next();
}

// column names in the db are snake_case, the website uses camelCase
const ENROLL_COLUMNS = `
  id, student_name AS studentName, institution, class_name AS className,
  phone, email, track, monthly_fee AS monthlyFee, status,
  created_at AS createdAt, updated_at AS updatedAt
`;

const CONTACT_COLUMNS = `
  id, name, email, phone, message, created_at AS createdAt
`;

app.get("/", (req, res) => {
  res.send("Skylearner backend is running");
});

// contact form on the website
app.post("/api/contact", (req, res) => {
  const { name, email, phone, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email and message are required" });
  }
  if (!validEmail(email)) {
    return res.status(400).json({ error: "email looks wrong" });
  }
  if (phone && !validPhone(phone)) {
    return res.status(400).json({ error: "phone number looks wrong" });
  }

  db.prepare(
    "INSERT INTO contacts (id, name, email, phone, message, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(newId(), name, email, phone || "", message, new Date().toISOString());

  res.json({ ok: true, message: "Thanks, we will get back to you soon." });
});

// student enrollment (Rs 200 per month)
app.post("/api/enroll", (req, res) => {
  const { studentName, institution, className, phone, email, track } = req.body || {};

  if (!studentName || !phone || !track) {
    return res.status(400).json({ error: "studentName, phone and track are required" });
  }
  if (!validPhone(phone)) {
    return res.status(400).json({ error: "phone number looks wrong" });
  }
  if (email && !validEmail(email)) {
    return res.status(400).json({ error: "email looks wrong" });
  }
  if (!TRACKS.includes(track)) {
    return res.status(400).json({ error: "unknown track", allowed: TRACKS });
  }

  // same phone + same track twice? don't create a duplicate
  const already = db
    .prepare("SELECT id FROM enrollments WHERE phone = ? AND track = ? AND status != 'completed'")
    .get(phone, track);
  if (already) {
    return res.status(409).json({
      error: "this student is already enrolled in this track",
      enrollmentId: already.id,
    });
  }

  const id = newId();
  db.prepare(`
    INSERT INTO enrollments
      (id, student_name, institution, class_name, phone, email, track, monthly_fee, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    id,
    studentName,
    institution || "",
    className || "",
    phone,
    email || "",
    track,
    MONTHLY_FEE,
    new Date().toISOString()
  );

  res.status(201).json({
    ok: true,
    enrollmentId: id,
    fee: MONTHLY_FEE,
    message: "Registration received. Our team will contact you on this number.",
  });
});

// ---- admin routes (need x-admin-key header) ----

app.get("/api/admin/enrollments", checkAdmin, (req, res) => {
  const rows = db.prepare(`SELECT ${ENROLL_COLUMNS} FROM enrollments ORDER BY created_at ASC`).all();
  res.json(rows);
});

app.get("/api/admin/contacts", checkAdmin, (req, res) => {
  const rows = db.prepare(`SELECT ${CONTACT_COLUMNS} FROM contacts ORDER BY created_at ASC`).all();
  res.json(rows);
});

app.patch("/api/admin/enrollments/:id", checkAdmin, (req, res) => {
  const { status } = req.body || {};

  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: "status must be one of " + STATUSES.join(", ") });
  }

  const result = db
    .prepare("UPDATE enrollments SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, new Date().toISOString(), req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "enrollment not found" });
  }

  const item = db
    .prepare(`SELECT ${ENROLL_COLUMNS} FROM enrollments WHERE id = ?`)
    .get(req.params.id);

  res.json({ ok: true, enrollment: item });
});

app.use((req, res) => {
  res.status(404).json({ error: "route not found" });
});

app.listen(PORT, () => {
  console.log("skylearner backend listening on port " + PORT + " (db: " + DB_FILE + ")");
});
