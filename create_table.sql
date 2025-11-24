<!-- ============================ -->
<!-- File: create_table.sql -->
<!-- ============================ -->


CREATE TABLE public.young_people_finances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  age_range text NOT NULL,
  postcode text,
  salary numeric,
  savings numeric,
  debt numeric,
  mortgage numeric,
  rent numeric,
  property_value numeric
);



-- Turn OFF RLS for testing (optional)
-- ALTER TABLE public.young_people_finances DISABLE ROW LEVEL SECURITY;
