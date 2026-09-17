-- 9. Landing-page reviews (public testimonials with moderation)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 5 AND 2000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anonymous/guest users can submit a review, but it always starts pending
CREATE POLICY "Reviews public insert" ON public.reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

-- Only approved reviews are readable by the public landing page
CREATE POLICY "Reviews public read approved" ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

-- Service role (admin panel + API) can do everything
CREATE POLICY "Reviews service role" ON public.reviews
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_reviews_status_created
  ON public.reviews (status, created_at DESC);