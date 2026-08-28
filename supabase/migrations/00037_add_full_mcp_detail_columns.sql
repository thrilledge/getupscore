-- Add columns to capture the full MCP `action=get` detail so the frontend
-- can render everything Upwork provides: client feedback score, real total
-- spend (from client_record.spend_total), timezone/state/region, contracts,
-- persons_to_hire, engagement type, hourly budget type, and the complete
-- preferred_qualifications object.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS client_feedback_score     numeric,
  ADD COLUMN IF NOT EXISTS client_timezone           text,
  ADD COLUMN IF NOT EXISTS client_state              text,
  ADD COLUMN IF NOT EXISTS client_region             text,
  ADD COLUMN IF NOT EXISTS client_contracts_active   integer,
  ADD COLUMN IF NOT EXISTS client_contracts_total    integer,
  ADD COLUMN IF NOT EXISTS persons_to_hire           integer,
  ADD COLUMN IF NOT EXISTS engagement_type           text,
  ADD COLUMN IF NOT EXISTS client_hourly_budget_type text,
  ADD COLUMN IF NOT EXISTS preferred_qualifications  jsonb;

COMMENT ON COLUMN public.jobs.client_feedback_score      IS 'From MCP client_record.feedback_score (0-5)';
COMMENT ON COLUMN public.jobs.client_timezone            IS 'From MCP clientCompanyPublic.timezone e.g Australia/Perth';
COMMENT ON COLUMN public.jobs.client_state               IS 'From MCP clientCompanyPublic.state';
COMMENT ON COLUMN public.jobs.client_region              IS 'From MCP clientCompanyPublic.country.region';
COMMENT ON COLUMN public.jobs.client_contracts_active    IS 'From MCP client_record.contracts_active';
COMMENT ON COLUMN public.jobs.client_contracts_total     IS 'From MCP client_record.contracts_total';
COMMENT ON COLUMN public.jobs.persons_to_hire            IS 'From MCP contractTerms.personsToHire';
COMMENT ON COLUMN public.jobs.engagement_type            IS 'From MCP hourlyContractTerms.engagementType (PART_TIME/FULL_TIME)';
COMMENT ON COLUMN public.jobs.client_hourly_budget_type  IS 'From MCP hourlyContractTerms.hourlyBudgetType';
COMMENT ON COLUMN public.jobs.preferred_qualifications   IS 'From MCP preferred_qualifications object';
