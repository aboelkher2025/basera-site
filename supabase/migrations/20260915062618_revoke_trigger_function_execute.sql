-- Trigger functions are not meant to be callable over PostgREST.
-- They are SECURITY DEFINER, so keep anon/authenticated off them entirely.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.guard_profile_roles() from anon, authenticated;
revoke execute on function public.recompute_progress() from anon, authenticated;
revoke execute on function public.set_enrollment_org() from anon, authenticated;

-- is_staff()/is_super()/my_role()/my_org() stay callable: they only ever
-- report on the caller's own row, and the panel reads them directly.
-- verify_certificate(text) is public by design (anonymous certificate check).
