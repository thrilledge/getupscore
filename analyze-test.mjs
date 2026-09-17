import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// ── Config ──────────────────────────────────────────────
const API_URL  = "https://profreemodels.vercel.app/api/v1/chat/completions";
const API_KEY  = "fm_live_XPiNVCY6cTTAQqz7UczK96OLzYZqSYlnhVJfCiBe5r1OUlVa";
const MODEL    = "claude-sonnet-5";
const TEMP     = 0.3;
const MAX_TOK  = 1500;
const DUMMY_UID = "00000000-0000-0000-0000-000000000000"; // system analysis, no real user

// ── DB ──────────────────────────────────────────────────
const envRaw = fs.readFileSync("D:\\upwork-jobs-ai\\.env.local", "utf8");
const env = {};
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ─────────────────────────────────────────────
function clamp(v) { const n = typeof v === "number" ? v : parseFloat(String(v ?? "")); if (!Number.isFinite(n)) return null; return Math.max(0, Math.min(100, Math.round(n))); }

function buildPrompt(job) {
  const title = job.title || "";
  const desc  = (job.description || "").slice(0, 3000);
  const skills = Array.isArray(job.skills) ? job.skills.join(", ") : "None listed";
  const budgetInfo = job.budget ? `$${job.budget}` : job.hourly_min ? `$${job.hourly_min}-$${job.hourly_max}/hr` : "Not specified";
  const budgetType = job.job_type || "Not specified";
  const level  = job.contractor_tier || "Not specified";
  const country = job.client_country || job.client_location_country || "Unknown";
  const rating = job.client_rating ? `${job.client_rating}/5` : "No rating";
  const score  = job.client_score != null ? `${job.client_score}/5` : "No score";
  const spend  = job.client_total_spend ? `$${job.client_total_spend}` : "Unknown";
  const hired  = job.client_total_hires ?? "Unknown";
  const posted = job.client_total_jobs_with_hires ?? "Unknown";
  const active = job.client_active_assignments ?? "Unknown";
  const proposals = job.proposals_count ?? "Unknown";
  const payment = job.client_payment_verified === true || job.payment_verified === true;

  return `Analyze this Upwork job. Return ONLY valid JSON.

JOB: ${title}
Desc: ${desc}
Skills: ${skills} | Budget: ${budgetInfo} (${budgetType}) | Level: ${level} | Proposals: ${proposals}

CLIENT: ${country} | Score: ${score} | Rating: ${rating} | Spend: ${spend} | Hires: ${hired} | Jobs posted: ${posted} | Active: ${active} | Payment: ${payment ? "verified" : "not verified"}

RULES: High client score (>=4), verified payment, hire history = POSITIVE signals. Only flag missing/negative data as red flags.

JSON schema:
{"match_score":<0-100>,"opportunity_score":<0-100>,"win_probability":<0-100>,"skills_match":{"matched_skills":[str],"missing_skills":[str],"overall_fit":"Good|Moderate|Weak"},"budget_fit":{"type":"hourly|fixed|unknown","assessment":str},"client_analysis":{"country":str,"payment_risk":"low|medium|high","experience":str,"recommendation":str},"competition_analysis":{"competition_level":"low|medium|high","advice":str},"recommendation":"strong_apply|apply|consider|skip|hide","reasoning":str,"proposal_tips":[str],"red_flags":[str]}`;
}

async function callLlm(prompt) {
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: "You are an expert Upwork job analyst. Do NOT output thinking process. Return ONLY valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: TEMP,
    max_tokens: MAX_TOK,
    response_format: { type: "json_object" },
  };

  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response");
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = (fenced ? fenced[1] : content).trim();
  return { parsed: JSON.parse(raw), model: data.model, usage: data.usage };
}

// ── Main ────────────────────────────────────────────────
async function main() {
  console.log(`Fetching 10 recent jobs with descriptions...`);
  const { data: jobs, error: qErr } = await admin
    .from("jobs")
    .select("id, upwork_job_id, title, description, job_type, contractor_tier, skills, budget, hourly_min, hourly_max, proposals_count, client_country, client_rating, client_score, client_total_spend, client_total_hires, client_total_jobs_with_hires, client_active_assignments, client_payment_verified, payment_verified")
    .not("description", "is", null)
    .order("posted_at", { ascending: false })
    .limit(10);

  if (qErr || !jobs?.length) {
    console.log("Query error:", qErr?.message || "no jobs");
    process.exit(1);
  }

  console.log(`Got ${jobs.length} jobs. Running analysis...\n`);
  const results = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const tag = `[${i + 1}/10] ${job.upwork_job_id}`;
    try {
      const prompt = buildPrompt(job);
      const { parsed, model, usage } = await callLlm(prompt);

      const match_score    = clamp(parsed.match_score);
      const opp_score      = clamp(parsed.opportunity_score);
      const win_prob       = clamp(parsed.win_probability);

      const row = {
        job_id:             job.id,
        user_id:            DUMMY_UID,
        match_score,
        opportunity_score:  opp_score,
        win_probability:    win_prob,
        skills_match:       parsed.skills_match || {},
        budget_fit:         parsed.budget_fit || {},
        client_analysis:    parsed.client_analysis || {},
        competition_analysis: parsed.competition_analysis || {},
        recommendation:     parsed.recommendation || "consider",
        reasoning:          parsed.reasoning || "",
        proposal_tips:      Array.isArray(parsed.proposal_tips) ? parsed.proposal_tips.slice(0, 10) : [],
        red_flags:          Array.isArray(parsed.red_flags) ? parsed.red_flags.slice(0, 10) : [],
        model_used:         model || MODEL,
      };

      const { error: insErr } = await admin
        .from("job_analyses")
        .upsert(row, { onConflict: "job_id, user_id", ignoreDuplicates: false });

      if (insErr) {
        console.log(`${tag} DB ERR: ${insErr.message}`);
      } else {
        console.log(`${tag} OK | match:${match_score} opp:${opp_score} win:${win_prob} rec:${parsed.recommendation} | model:${model} tokens:${usage?.total_tokens ?? "?"} | ${job.title?.slice(0, 45)}`);
      }
      results.push({ upwork_id: job.upwork_job_id, match_score, opp_score, win_prob, rec: parsed.recommendation, ok: !insErr });
    } catch (err) {
      console.log(`${tag} FAIL: ${err.message} | ${job.title?.slice(0, 45)}`);
      results.push({ upwork_id: job.upwork_job_id, err: err.message });
    }
  }

  console.log(`\nDone. ${results.filter(r => r.ok).length}/10 analyzed + saved.`);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
