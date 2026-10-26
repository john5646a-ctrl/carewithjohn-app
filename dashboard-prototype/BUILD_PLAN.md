# Better Living Services Business Hub — Build Plan

## Goal
Build a private, mobile-friendly operations hub for Better Living Services. Keep the existing public website on `main` unchanged while the private application is developed and tested on this feature branch.

## Confirmed business needs
- Services: home help and support packages; regular cleaning; deep cleans; future wash-and-fold laundry.
- Potential future services to track: carpet cleaning, pressure washing, and garden maintenance.
- Shared operations: customers, bookings/calendar, staff and shifts, tasks/visit notes, quotes/enquiries, documents/procedures, equipment/supplies, complaints/follow-ups, marketing planner, reports/settings.
- Finance: income and expenses by service, unpaid invoices, job-level costs/margins, staff cost tracking, savings goals, and the user's planning allocation of 25% tax reserve / 40% business costs / 10% buffer / 25% personal allocation.
- Current accounting tool of interest: QuickBooks. Integration must be evaluated and explicitly configured; do not assume a connection exists.
- Laundry must be present as a future-ready module, but proposed prices and supplier arrangements must remain editable and clearly marked as unconfirmed.
- Branding should follow Better Living Services' existing brand. Do not create a replacement logo; use the supplied official asset when available.

## Recommended architecture to validate
- Keep the public marketing website and private business app separated by deployment path/subdomain and access controls.
- Use a maintained application framework rather than extending one giant HTML file indefinitely.
- Evaluate Supabase Auth + Postgres with Row Level Security for accounts and persistent records, and Cloudflare Workers/Pages for hosting and server-side routes. Confirm actual account/project access, cost, domain configuration, and deployment constraints before committing to production.
- Never put service-role secrets or database credentials in browser code.
- Start with owner-only access; add staff roles only after permissions are tested.
- Use migrations for schema changes, repeatable test data for development, and backups/export plus restore checks before live data.

## Information architecture
1. Overview — today's jobs, outstanding follow-ups, service summary, cash/finance snapshot, quick actions.
2. Services — Home help & support; Regular cleaning; Deep cleans; Wash & fold laundry (future); expandable future services.
3. Customers — shared customer directory, service history, contact preferences, consent and data-retention controls.
4. Bookings & calendar — recurring and one-off jobs, assignment, statuses, cancellation/rescheduling, travel buffers.
5. Staff & shifts — profiles, availability, job assignments, approved hours, training/checklist reminders. Payroll remains handled/reconciled through appropriate payroll software.
6. Tasks & visit notes — daily task list, service checklists, completion records, issues/complaints and follow-ups.
7. Income & expenses — categorised transactions, invoices/payment status, costs linked to service/job, export and reconciliation.
8. Money allocation — editable 25/40/10/25 planning split; clearly label as a cash-planning preference, not a tax calculation or accounting advice.
9. Savings goals — editable goals, contributions, targets, and progress.
10. Equipment & supplies — inventory, purchases, maintenance, suppliers and potential expansion equipment.
11. Documents & procedures — controlled document metadata, templates, insurance/compliance reminders and version history; secure file storage.
12. Enquiries & marketing — lead pipeline, quote follow-ups, post drafts/planner, customer feedback and permission tracking.
13. Reports & settings — service performance, job margins, monthly totals, user roles, service setup and integrations.

## Delivery stages
### Stage A — Product foundation
- Refine this specification, audit current repository and live deployment configuration.
- Replace placeholder headings and ensure navigation, mobile layout, empty states and accessibility are consistent.
- Use synthetic demo records only.

### Stage B — Data model and access control
- Define tables, relationships, constraints, indexes, audit timestamps, and migrations.
- Add authentication and server-enforced role checks.
- Apply RLS to every exposed table and storage bucket; test allow/deny cases for anonymous, owner, and staff users.
- Add a privacy-aware retention/deletion/export process.

### Stage C — Core workflows
- Build persistent customer records, service-specific job records, recurring bookings/calendar, task checklists, enquiries/quotes, and documents.
- Add validated forms, search/filter, edit/archive, clear error messages, and mobile-friendly flows.

### Stage D — Finance and staff
- Build income/expense records, payment status, job cost/margin reports, allocation planning, savings goals, and approved-hours tracking.
- Keep bookkeeping and payroll integration explicitly separate until tested and authorised.
- Do not label turnover as profit; distinguish recorded income, expenses, cash position, and estimated margins.

### Stage E — Future services and integrations
- Build laundry orders, bag sizes, collection/delivery routes, supplier costs, turnaround status and margin tracking, without treating proposed pricing as final.
- Evaluate QuickBooks and calendar/email integrations based on available APIs, permissions, pricing, and reliability.

### Stage F — Quality and release
- Test on mobile and desktop; validate form inputs, date/time handling, recurring booking edge cases, calculations, access permissions, backups/restores, and failure states.
- Run dependency/security checks and verify no secrets are committed.
- Test on a separate preview/staging deployment.
- Only deploy the private app after credentials, domain/access controls, data policies and recovery plan are confirmed. Do not merge into `main` or alter the public site without an explicit deployment decision.

## Acceptance criteria
- All modules have clear navigation and meaningful empty states.
- Records persist after refresh and across authorised sessions.
- Unauthenticated users cannot access the app or its data.
- Staff can access only the information allowed by their role.
- Every sensitive table and file area has tested access policies.
- Money calculations are validated and labelled clearly.
- A tested backup/export and restore procedure exists.
- The public website remains unaffected throughout development.

## Current limitations / required setup
The current prototype is a front-end draft with in-memory demo data only. This repository branch does not by itself prove that a Supabase project, production domain, email provider, or QuickBooks connection is configured. Those need to be verified and configured before real records can be stored or the application can be released.
