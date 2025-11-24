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

-- IMPORTANT: Allow inserts from your website
ALTER TABLE public.young_people_finances
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon inserts"
ON public.young_people_finances
FOR INSERT
TO anon
WITH CHECK (true);