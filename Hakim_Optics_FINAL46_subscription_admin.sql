-- Hakim Optics FINAL46
-- Seller-only subscription disable + customer registration removal.
-- Does NOT delete patient/sales data tables by name; it removes the customer's
-- subscription/center registration and the Supabase Auth user.

CREATE OR REPLACE FUNCTION public.hakim_seller_disable_license(p_center_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_center text := upper(trim(p_center_id));
BEGIN
  IF NOT public.hakim_is_seller() THEN
    RAISE EXCEPTION 'غير مصرح: حساب البائع فقط';
  END IF;
  IF v_center IS NULL OR v_center = '' THEN
    RAISE EXCEPTION 'معرف المركز مطلوب';
  END IF;

  UPDATE public.hakim_licenses
     SET active = false, updated_at = now()
   WHERE upper(center_id) = v_center;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.hakim_seller_disable_license(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hakim_seller_disable_license(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.hakim_seller_remove_customer(p_center_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_center text := upper(trim(p_center_id));
  v_owner uuid;
  v_deleted boolean := false;
BEGIN
  IF NOT public.hakim_is_seller() THEN
    RAISE EXCEPTION 'غير مصرح: حساب البائع فقط';
  END IF;
  IF v_center IS NULL OR v_center = '' THEN
    RAISE EXCEPTION 'معرف المركز مطلوب';
  END IF;

  -- Resolve the Google/Supabase Auth owner before removing registration.
  SELECT owner_id INTO v_owner
  FROM public.hakim_sync
  WHERE upper(center_id) = v_center
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  -- Remove the commercial registration/subscription first.
  DELETE FROM public.hakim_licenses WHERE upper(center_id) = v_center;
  IF FOUND THEN v_deleted := true; END IF;

  DELETE FROM public.hakim_sync WHERE upper(center_id) = v_center;
  IF FOUND THEN v_deleted := true; END IF;

  -- Finally remove the customer's Supabase Auth account.
  -- This requires the function to run with its owner privileges.
  IF v_owner IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_owner;
    IF FOUND THEN v_deleted := true; END IF;
  END IF;

  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.hakim_seller_remove_customer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hakim_seller_remove_customer(text) TO authenticated;

-- IMPORTANT:
-- If your other patient/sales tables have owner_id foreign keys with ON DELETE CASCADE,
-- deleting auth.users will cascade those rows automatically.
-- This function intentionally does not issue broad/dynamic DELETE statements against
-- unknown application tables, to avoid accidental deletion of unrelated data.
