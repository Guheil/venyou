# Admin Panel — Feature Requirements & Improvements

---

## 🔐 Authentication

- Replace the email confirmation link during registration with an **OTP (One-Time Password)** flow for stronger security.

---

## 👤 User & Contact Management

- Add a **Contact Number** field to user/profile forms.
- Contact Number must be **numeric only** — validate and restrict non-numeric input.

---

## 💳 Payment & Confirmation

- Admins must be able to **view uploaded payment proofs** (screenshots/receipts) before approving any event or reservation.
- Add a **payment confirmation step** on the admin side with two options:
  - ✅ Online Payment (e.g., GCash, bank transfer)
  - ✅ Face-to-Face / Cash

---

## 📋 Tables & Data Display

> Applies to all modules: Cards, Venues, Reservations, Events, etc.

- **Never show raw IDs** in tables — always display the associated **name** (e.g., venue name, user name, event name).
- Use **2–3 column layouts** in all data tables to display more information per row.
- Add **search bars and filters** (by status, date, category, etc.) to every table view.
- All interfaces must be **user-friendly and non-technical** in language and design.

---

## 🏟️ Venues (Admin Side)

- Include **image upload** functionality when adding or editing a venue.
- Remove the **image color/hex code** field — admins are not developers and won't understand it.
- **Display the venue image** prominently in the venue listing and detail views.
- Improve the **overall presentation** of venue data (e.g., use cards with image previews instead of plain table rows).

---

## 📅 Events & Reservations

- The **total guest count** display should use **abbreviated notation** for large numbers:
  - e.g., `1,200` → `1.2k`, `5,000` → `5k`
  - Remove the 999-guest hard cap or handle overflow gracefully with `k` formatting.

---

## 📊 Analytics

- Replace or supplement basic stats with **diverse chart types**, such as:
  - Bar charts, line graphs, pie/donut charts, heatmaps, or area charts
- Include **multiple analytics dimensions**, for example:
  - Bookings over time
  - Revenue trends
  - Venue popularity
  - Payment method breakdown
  - Guest volume
  - Reservation status distribution

---

## ✅ General UX Principles

- All admin-facing UI must use **plain, non-technical language**.
- Prefer **named labels** over codes, IDs, or hex values everywhere.
- Every major section should have **search + filter functionality**.
- Data-heavy pages should use **multi-column layouts** for better information density.