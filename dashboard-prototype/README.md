# Better Living Services Business Hub

Development work only. This branch does not change the public website on `main`.

## Files
- `app.html` — expanded interactive front-end preview with clickable sections and browser-local CRUD for customers, bookings, staff, tasks, enquiries, transactions, savings goals, equipment, document records and marketing items. It includes service-specific views for home help, regular cleaning, deep cleans and future wash-and-fold laundry.
- `index.html` — earlier visual prototype.
- `BUILD_PLAN.md` — product requirements and staged delivery plan.
- `supabase-schema.sql` — proposed owner-scoped Postgres schema and RLS policies for a dedicated Supabase development project. It has not been applied to a database.
- `DEPLOYMENT_CHECKLIST.md` — requirements before real use.

## Important
`app.html` is a **browser-local preview**, not a production application. Its records are stored in localStorage in the current browser and are not encrypted, synchronised across devices, authenticated, or protected by server-side permissions. Browser-local data can be lost and is not a secure backup. Do not enter real customer, staff, financial, access-code, health, or other sensitive information.

The app does not currently connect to Supabase, QuickBooks, bank feeds, email, calendar providers, or social media. No production deployment has been made.

## How to preview
Open `app.html` in a browser from this branch or download the file and open it locally. Use sample data only. The browser-local records persist on that browser until cleared or browser storage is removed; use Export data to create a JSON file for testing only.

## Before production
1. Confirm which Supabase project is intended for this app; do not use an unrelated project. The available projects were reported inactive during initial setup, so verify project status and cost before enabling compute.
2. Review and apply schema through a reviewed migration on a dedicated development project. Test every RLS policy with anonymous, owner and non-owner sessions. Add staff sharing only with an explicit role model and tests.
3. Implement a real sign-in screen, session handling, server-backed CRUD, input validation, access checks, secure file storage and recovery.
4. Test all financial calculations and date/recurrence edge cases; distinguish income, expenses, net movement, liabilities, tax reserve and actual cash.
5. Test mobile, accessibility, errors, dependency security, backups/restores, and exports.
6. Configure private deployment/domain access without touching the public website. Keep all secrets out of source control and browser code.
7. Only migrate real records after acceptance testing, access-control review and a verified recovery plan.
