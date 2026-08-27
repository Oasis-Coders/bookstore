-- Fix sale_number_seq overflow (was integer, hit 20260826... large value from old SAL format)
-- Recreate as bigint and reset to safe range, fix generate_sale_number to be robust
-- NOTE: Do NOT use CASCADE - that would drop apply_sale functions

-- Drop old sequence without CASCADE if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relkind='S' AND relname='sale_number_seq') THEN
    -- Only drop if no dependencies, otherwise alter
    BEGIN
      DROP SEQUENCE public.sale_number_seq;
    EXCEPTION WHEN OTHERS THEN
      -- If cannot drop due to dependencies, just alter it
      EXECUTE 'ALTER SEQUENCE public.sale_number_seq AS bigint';
    END;
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.sale_number_seq AS bigint START 100010;

-- Recreate generate_sale_number robustly
CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_seq bigint;
  v_max bigint;
BEGIN
  -- Find max C number safely
  SELECT MAX((substring(sale_number from 'C(\d+)'))::bigint)
  INTO v_max
  FROM public.sales_transactions
  WHERE sale_number ~ '^C\d+$';

  IF v_max IS NOT NULL AND v_max >= 100000 THEN
    PERFORM setval('public.sale_number_seq', GREATEST(v_max, 100010), true);
  ELSE
    PERFORM setval('public.sale_number_seq', 100010, false);
  END IF;

  v_seq := nextval('public.sale_number_seq');
  RETURN 'C' || lpad(v_seq::text, 6, '0');
END;
$$;

-- Ensure permissions
GRANT USAGE ON SEQUENCE public.sale_number_seq TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_sale_number() TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
