-- Verify effective organizations / organization_members policies (read-only).
-- Expected after 20261012000000: NO INSERT policy on public.organizations;
-- NO INSERT policy on public.organization_members.

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  permissive,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename in ('organizations', 'organization_members')
order by tablename, cmd, policyname;
