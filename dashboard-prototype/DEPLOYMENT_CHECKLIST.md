# Production release checklist

Do not publish the browser preview as a private production application. Do not merge this branch into main as part of the public website release.

Before real data is entered:
- Choose a dedicated Supabase project and confirm status, region, billing and recovery options.
- Apply the proposed schema through a reviewed migration on a development database only.
- Implement sign-in, sign-out, session expiry, password reset and server-enforced permissions.
- Test database access rules with anonymous, owner and different-user sessions for every table.
- Verify that one user cannot read, change, export or delete another user's data.
- Configure secure file storage and file access rules before uploads are enabled.
- Define staff roles and restrict access to finance, HR records and customer information.
- Add reliable change history for sensitive records, plus export and deletion processes.
- Verify backups by completing a restore test.
- Validate money calculations, rounding, unpaid records, dates, exports and error handling.
- Keep statutory payroll in an appropriate payroll process; this app is not payroll software.
- Test mobile and desktop layout, accessibility, slow connections and failed saves.
- Verify the private app cannot be accessed without a valid session, including direct URLs and files.
- Review privacy notices, data minimisation and data-handling arrangements.
- Run dependency and security checks and verify no secrets or real customer information are committed.
- Only release after all tests pass and confirm the public website remains unchanged.

Integrations: QuickBooks, banks, email, calendars and social publishing are not connected. Each requires explicit authorisation and separate testing.

Current status: app.html is a browser-local interactive preview; supabase-schema.sql is proposed and has not been applied; production authentication, database and private hosting are not configured.
