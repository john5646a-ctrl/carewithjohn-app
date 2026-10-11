-- Align database policies with the canonical role mapping in public.current_role().
-- That helper maps admin_owner -> 'admin'; policies must compare against 'admin',
-- not the raw application role name 'admin_owner'.
-- Product rule: Client and Family Member accounts have no financial visibility.
begin;

drop policy if exists invoices_client_family_select on public.invoices;

drop policy if exists organisation_memberships_admin_write on public.organisation_memberships;
create policy organisation_memberships_admin_write
  on public.organisation_memberships
  for all
  to authenticated
  using (
    organisation_id = public.current_org_id()
    and public.current_role() = 'admin'
  )
  with check (
    organisation_id = public.current_org_id()
    and public.current_role() = 'admin'
  );

drop policy if exists organisation_memberships_select on public.organisation_memberships;
create policy organisation_memberships_select
  on public.organisation_memberships
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      organisation_id = public.current_org_id()
      and public.current_role() = 'admin'
    )
  );

drop policy if exists person_access_relationships_admin_write on public.person_access_relationships;
create policy person_access_relationships_admin_write
  on public.person_access_relationships
  for all
  to authenticated
  using (
    organisation_id = public.current_org_id()
    and public.current_role() = 'admin'
  )
  with check (
    organisation_id = public.current_org_id()
    and public.current_role() = 'admin'
  );

drop policy if exists person_access_relationships_select on public.person_access_relationships;
create policy person_access_relationships_select
  on public.person_access_relationships
  for select
  to authenticated
  using (
    (user_id = (select auth.uid()) and status = 'active')
    or (
      organisation_id = public.current_org_id()
      and public.current_role() = 'admin'
    )
  );

commit;
