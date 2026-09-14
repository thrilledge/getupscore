-- 00042_normalize_client_countries.sql
--
-- The Upwork MCP sometimes returns a 3-letter ISO code in client_country
-- ("USA", "GBR", "IND", ...) alongside the full country name used elsewhere.
-- Normalize every short code -> full name so the Client Country filter and
-- facets list are consistent and de-duplicated.
--
-- Idempotent: once applied no 3-letter codes remain, so re-runs are no-ops.
-- Applied on the live DB via the Supabase Management API (CLI db push blocked).

UPDATE jobs SET client_country = m.name
FROM (VALUES
  ('USA','United States'), ('AUS','Australia'), ('GBR','United Kingdom'),
  ('CAN','Canada'), ('PAK','Pakistan'), ('BRA','Brazil'), ('IND','India'),
  ('DEU','Germany'), ('NLD','Netherlands'), ('ARE','United Arab Emirates'),
  ('CHN','China'), ('DNK','Denmark'), ('JPN','Japan'), ('NZL','New Zealand'),
  ('SAU','Saudi Arabia'), ('SVN','Slovenia'), ('PHL','Philippines'),
  ('NGA','Nigeria'), ('ETH','Ethiopia'), ('SVK','Slovakia'), ('TUR','Turkey'),
  ('FRA','France'), ('POL','Poland'), ('ZAF','South Africa'),
  ('KGZ','Kyrgyzstan'), ('SYC','Seychelles'), ('TUV','Tuvalu'),
  ('SRB','Serbia'), ('LUX','Luxembourg'), ('GEO','Georgia'),
  ('BGR','Bulgaria'), ('PRT','Portugal'), ('MYS','Malaysia'),
  ('ESP','Spain'), ('KEN','Kenya'), ('ISR','Israel'), ('IRL','Ireland'),
  ('AUT','Austria'), ('VEN','Venezuela'), ('IDN','Indonesia')
) AS m(code, name)
WHERE jobs.client_country = m.code;