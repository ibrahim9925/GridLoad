---
name: RBAC & RLS model
description: How auth roles and row-level security are enforced across CRM tables
type: feature
---
- `useAuthCore` queries `public.user_roles` via the `get_current_user_role()` RPC (security definer). Role is never hardcoded.
- Every CRM table has a single policy: `Admins full access` — `USING/WITH CHECK public.is_admin()`. `anon` is revoked. `service_role` retains ALL.
- Tables exempt from the admin-only policy: `profiles` (user-scoped) and `user_roles` (self-read + admin-managed).
- To grant non-admin roles access in the future, add additional per-role policies — do not relax the admin-only baseline.
