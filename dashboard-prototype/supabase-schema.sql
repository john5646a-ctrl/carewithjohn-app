-- Better Living Services Business Hub: initial owner-only schema
-- Apply only to a dedicated development Supabase project after confirming project identity.
-- Do NOT apply to an existing unrelated project or production database without review.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists public.bls_customers (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 full_name text not null,
 phone text,
 email text,
 service_address text,
 services text[] not null default '{}',
 status text not null default 'Active' check (status in ('Active','Enquiry','Inactive')),
 service_preferences text,
 consent_notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.bls_staff (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 full_name text not null,
 role_title text,
 phone text,
 email text,
 hourly_rate numeric(10,2) check (hourly_rate is null or hourly_rate >= 0),
 status text not null default 'Active' check (status in ('Active','On leave','Inactive')),
 availability_notes text,
 training_notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.bls_bookings (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 customer_id uuid references public.bls_customers(id) on delete set null,
 customer_name text not null,
 job_title text not null,
 service text not null check (service in ('Home help','Regular cleaning','Deep clean','Laundry','Carpet cleaning','Pressure washing','Garden maintenance')),
 service_date date not null,
 start_time time,
 duration_hours numeric(6,2) check (duration_hours is null or duration_hours >= 0),
 staff_id uuid references public.bls_staff(id) on delete set null,
 assigned_staff_name text,
 status text not null default 'Enquiry' check (status in ('Enquiry','Quoted','Confirmed','In progress','Completed','Cancelled')),
 recurring text not null default 'One-off' check (recurring in ('One-off','Weekly','Fortnightly','Monthly')),
 agreed_price numeric(10,2) check (agreed_price is null or agreed_price >= 0),
 job_notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.bls_tasks (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 related_to text,
 due_date date,
 assigned_to text,
 priority text not null default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
 status text not null default 'Open' check (status in ('Open','In progress','Done')),
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.bls_enquiries (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 contact_name text not null,
 contact_details text,
 service_requested text not null,
 source text,
 enquiry_date date,
 quote_value numeric(10,2) check (quote_value is null or quote_value >= 0),
 stage text not null default 'New' check (stage in ('New','Contacted','Quote needed','Quote sent','Awaiting reply','Won','Not proceeding')),
 follow_up_date date,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.bls_transactions (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 transaction_type text not null check (transaction_type in ('Income','Expense')),
 description text not null,
 amount numeric(12,2) not null check (amount >= 0),
 service text not null,
 category text not null,
 transaction_date date not null,
 payment_status text not null default 'Paid' check (payment_status in ('Paid','Unpaid','Part paid')),
 reference text,
 notes text,
 booking_id uuid references public.bls_bookings(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.bls_allocations (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 tax_percent numeric(5,2) not null default 25 check (tax_percent between 0 and 100),
 business_costs_percent numeric(5,2) not null default 40 check (business_costs_percent between 0 and 100),
 buffer_percent numeric(5,2) not null default 10 check (buffer_percent between 0 and 100),
 personal_percent numeric(5,2) not null default 25 check (personal_percent between 0 and 100),
 updated_at timestamptz not null default now(),
 check (tax_percent + business_costs_percent + buffer_percent + personal_percent = 100)
);

create table if not exists public.bls_savings_goals (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 target_amount numeric(12,2) not null check (target_amount > 0),
 saved_amount numeric(12,2) not null default 0 check (saved_amount >= 0),
 target_date date,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.bls_supplies (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 item_name text not null,
 category text not null,
 quantity numeric(10,2),
 cost numeric(12,2) check (cost is null or cost >= 0),
 supplier text,
 maintenance_date date,
 status text not null default 'In stock',
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.bls_documents (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 category text not null,
 version_status text,
 review_date date,
 responsible_person text,
 storage_path text,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.bls_marketing (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 channel text not null,
 planned_date date,
 status text not null default 'Idea' check (status in ('Idea','Draft','Ready for review','Scheduled','Published','Archived')),
 goal text,
 draft_notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.bls_audit_events (
 id bigint generated always as identity primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 table_name text not null,
 record_id uuid,
 action text not null check (action in ('INSERT','UPDATE','DELETE')),
 happened_at timestamptz not null default now()
);

create index if not exists bls_customers_owner_name_idx on public.bls_customers(owner_id, full_name);
create index if not exists bls_bookings_owner_date_idx on public.bls_bookings(owner_id, service_date);
create index if not exists bls_bookings_owner_status_idx on public.bls_bookings(owner_id, status);
create index if not exists bls_tasks_owner_due_idx on public.bls_tasks(owner_id, due_date);
create index if not exists bls_transactions_owner_date_idx on public.bls_transactions(owner_id, transaction_date);
create index if not exists bls_enquiries_owner_followup_idx on public.bls_enquiries(owner_id, follow_up_date);

do $$
declare t text;
begin
 foreach t in array array['bls_customers','bls_staff','bls_bookings','bls_tasks','bls_enquiries','bls_transactions','bls_allocations','bls_savings_goals','bls_supplies','bls_documents','bls_marketing','bls_audit_events'] loop
   execute format('alter table public.%I enable row level security', t);
   execute format('drop policy if exists "owner reads own rows" on public.%I', t);
   execute format('drop policy if exists "owner inserts own rows" on public.%I', t);
   execute format('drop policy if exists "owner updates own rows" on public.%I', t);
   execute format('drop policy if exists "owner deletes own rows" on public.%I', t);
   execute format('create policy "owner reads own rows" on public.%I for select to authenticated using (owner_id = (select auth.uid()))', t);
   execute format('create policy "owner inserts own rows" on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))', t);
   execute format('create policy "owner updates own rows" on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', t);
   if t <> 'bls_audit_events' then
     execute format('create policy "owner deletes own rows" on public.%I for delete to authenticated using (owner_id = (select auth.uid()))', t);
   end if;
 end loop;
end $$;

do $$
declare t text;
begin
 foreach t in array array['bls_customers','bls_staff','bls_bookings','bls_tasks','bls_enquiries','bls_transactions','bls_allocations','bls_savings_goals','bls_supplies','bls_documents','bls_marketing'] loop
   execute format('drop trigger if exists set_updated_at on public.%I', t);
   execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
 end loop;
end $$;

-- Intentionally no public/anon access policies.
-- Staff multi-user sharing is not enabled by this owner-only initial schema.
-- Before production: verify Storage bucket policies, add tested audit triggers, and review policies with Supabase security advisors.
