# NurtureX v3.1 — Upgrade Notes

Adds **Appointments**, **Medical Notes**, and **Clinic information** to the v3 healthcare platform. No framework switch — kept on Tailwind / lucide / recharts (you previously chose option B). All new features are real DB-backed, not mockups.

---

## 🚨 First — three things to do before running

### 1. Run the v3.1 SQL schema
Open `supabase_schema.sql`, copy the whole file, paste into **Supabase Dashboard → SQL Editor → New query → Run**. Same as before — idempotent and self-repairing. The header now reads `Database Schema (v3.1)`.

It adds:
- `appointments` table with full RLS
- `medical_notes` table with full RLS
- `clinic_name`, `clinic_address`, `clinic_phone` columns on `profiles`
- Triggers and indexes for both new tables
- Self-repair section is extended to also cover the new tables

### 2. `npm install` (no new dependencies, but if you upgraded from v2 the Tailwind/lucide/recharts deps might still need installing)

### 3. `npm run dev`

If sign-in still works and your existing data is intact, you're good. The new tables start empty.

---

## What's new in v3.1

### 🗓️ Calendar / Appointment management
**`/doctor/appointments`** — full month-grid calendar with two views:
- **Calendar view** — 7-column month grid, today highlighted, clickable empty cells (opens "new appointment" modal pre-filled with that date), clickable appointment chips (opens edit modal), color-coded by appointment type (checkup / vaccination / consultation / follow-up / other), "+N more" overflow when a day has more than 3.
- **List view** — chronological list with date column, type badge, status, location, duration, and notes preview.
- Month nav (Prev / Next / Today buttons).
- New / Edit modal: date+time, duration, type, status, patient & infant pickers (scoped to this doctor), location (auto-prefilled with clinic info from your profile), notes.
- Quick status-set buttons (Mark completed / Mark no-show / Cancel) for scheduled appointments.

**`/admin/appointments`** — cross-doctor oversight table with filters: doctor, status, date range. Read-only view.

### 📝 Medical notes
A new **Notes** tab in **Infant Detail** (both admin and doctor views). Each note has:
- Title
- Content (free-form clinical observations)
- Recommendations (highlighted callout box)

Notes show the doctor name and timestamp. Add / Edit / Delete works inline. Backed by a new `medical_notes` table with RLS scoping doctors to their own.

### 🏥 Clinic information
**Doctor Profile** (`/doctor/profile`) now has a "Clinic information" section:
- Clinic name
- Clinic address
- Clinic phone

These show on the identity card, and they auto-populate the **Location** field on new appointments. The fields are stored as columns on `profiles` (no separate clinic table — one location per doctor; if you need multi-location later, that's a small addition).

### 📊 Doctor Dashboard — new "Schedule" widget
The doctor dashboard now has a **Schedule** card showing today's and the next 7 days' appointments at a glance, with a "Today" highlight chip. Clicking opens the calendar.

### 🧭 Sidebar
Both admin and doctor sidebars now have an **Appointments** entry with the calendar icon.

---

## File map (delta from v3)

### New files
```
src/services/medicalNoteService.js
src/pages/admin/AdminAppointments.jsx
```

### Significantly rewritten
```
supabase_schema.sql                         (v3.1 — adds appointments, medical_notes, clinic columns)
src/services/appointmentService.js          (was a legacy stub; now fully featured)
src/pages/doctor/DoctorAppointments.jsx     (was a legacy stub; now full month calendar)
src/pages/doctor/DoctorProfile.jsx          (added clinic section)
src/pages/doctor/DoctorDashboard.jsx        (added Schedule widget)
src/pages/shared/InfantDetail.jsx           (added Notes tab + NoteModal)
src/components/Sidebar.jsx                  (added Appointments entry)
src/App.jsx                                 (added /admin/appointments + /doctor/appointments routes)
```

### Untouched
The legacy unrouted files (`DoctorClinics.jsx`, `DoctorMessages.jsx`, `AdminUsers.jsx`, etc.) are still on disk but not reachable. Same as v3.

---

## Acceptance checklist

- [ ] Run v3.1 SQL — see `Database Schema (v3.1)` in the header. No errors.
- [ ] **Doctor → Profile**: fill in clinic name, address, phone. Save. Clinic shows on identity card.
- [ ] **Doctor → Appointments**: open calendar. Click an empty day → modal opens with that date prefilled. Submit → chip appears on that day.
- [ ] Click the new chip → edit modal opens with prefilled values.
- [ ] In the edit modal, click "Mark completed" → status flips, chip styling fades.
- [ ] Switch to **List view** → see appointments chronologically.
- [ ] **Doctor → Dashboard**: "Schedule" widget shows today/upcoming entries.
- [ ] **Admin → Appointments**: see all appointments across doctors with filters.
- [ ] **Doctor → Infants → [pick one] → Notes tab**: add a note with a title + content + recommendations. Note renders with recommendations callout. Edit it. Delete it.
- [ ] **Admin → Infants → [pick one] → Notes tab**: same UI, sees all notes regardless of doctor.

---

## Common gotchas

### "Appointment doesn't show up on the calendar"
The `scheduled_at` field stores a UTC `timestamptz`. The calendar groups by **local** date. If you're testing across timezones, an appointment scheduled at 11pm UTC might land on a different local date. The form uses `<input type="datetime-local">` which is in your browser's timezone, so this only matters if you're inspecting the DB directly.

### "RLS error when adding a medical note as admin"
The `medical_notes` table requires `doctor_id = auth.uid()` for the doctor RLS policy. Admins use the `admins manage all medical_notes` policy — both work. If you're an admin adding a note on behalf of an infant, the modal sets `doctor_id` to the **infant's assigned doctor** automatically. If the infant has no assigned doctor, it sets `doctor_id` to null, which is fine because admins don't go through the doctor RLS policy.

### "Form fields look misaligned in dark mode"
Already styled — let me know which page if you see this. Tailwind handles theme tokens consistently.

---

## Things still on the bench (if you want them later)

- **Recurring appointments** (e.g. weekly checkups). Currently each appointment is one-off.
- **Conflict detection** (two appointments overlapping). Trivially added with a query on `scheduled_at` ranges.
- **Calendar week / day views**. Currently month + list. Recharts doesn't help here, but a simple grid for week/day is straightforward.
- **Notes attached to patients (mothers), not just infants**. The DB schema already supports `patient_id` on `medical_notes`, but the UI only exposes infant-scoped notes for now. Mirror the UI to a `PatientDetail` page if needed.
- **iCal export** of a doctor's calendar. Could add a `/api/calendar.ics` Edge Function or just generate ICS client-side.
