# Better Living Services private dashboard — prototype

This folder contains a **non-production UI prototype** for the planned private business management dashboard.

## Important safety limits
- It uses no real business or customer data.
- It does not connect to a bank, QuickBooks, Supabase, or any external service.
- Entries are held only in page memory and disappear on refresh.
- There is no authentication or database yet.
- Do not publish this folder as a live private dashboard or enter real financial, staff, or customer information.

## Intended next implementation stages
1. Confirm this prototype's layout and core dashboard sections.
2. Inspect the current deployed Better Living Services site and hosting configuration.
3. Add the private area to the same overall application without replacing or disrupting the public website.
4. Configure authenticated access and a persistent database, with server-side authorization and row-level access policies.
5. Add validated financial records, allocation calculations, savings goals, then staff, bookings, and laundry workflows.
6. Test security, mobile layouts, data persistence, and financial calculations before any deployment.

## Initial finance allocation preference
- Tax reserve: 25%
- Business costs: 40%
- Business buffer: 10%
- Personal allocation: 25%

These are the owner's budgeting preferences, not tax calculations. Production reporting must distinguish income, expenses, profit, liabilities, and cash available.
