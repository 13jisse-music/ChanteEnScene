-- Push notification log
CREATE TABLE IF NOT EXISTS public.push_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  session_id uuid REFERENCES sessions(id),
  title text NOT NULL,
  body text NOT NULL,
  url text,
  image text,
  role text DEFAULT 'all',
  is_test boolean DEFAULT false,
  sent int DEFAULT 0,
  failed int DEFAULT 0,
  expired int DEFAULT 0,
  sent_by text
);

ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read push_log" ON public.push_log
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert push_log" ON public.push_log
  FOR INSERT WITH CHECK (true);
