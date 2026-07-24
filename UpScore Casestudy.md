# UpScore — AI-Powered Upwork Opportunity Finder

**Type:** Full-Stack SaaS Platform | **Built by:** Thrill Edge | **Status:** Live in Production


## Overview

UpScore is a full-stack SaaS platform that helps freelancers discover high-value Upwork opportunities in real-time, AI-score them for relevance and win probability, and generate winning proposals — all from a single dashboard. It combines automated data pipelines, AI analysis, multi-channel notifications, and a Chrome extension into one integrated system.

## The Problem

Freelancers on Upwork waste hours manually browsing jobs, most of which are poor matches or already flooded with proposals. There was no tool that could automatically surface relevant jobs, intelligently score them against a freelancer's specific criteria, and generate tailored proposals instantly.

## What I Built

### Real-Time Job Ingestion Pipeline

A Python FastAPI service running on AWS EC2 that continuously fetches fresh job listings, enriches them with client details (payment verification, hire rate, spend history, company info), deduplicates entries, and stores everything in a PostgreSQL database. Runs every 5 minutes via a systemd timer with automatic cookie refresh for sustained data access.

### AI Job Scoring Engine

OpenAI GPT-4o-mini analyzes every job against the user's saved filters and produces:
- **Match Score** — How well the job fits the freelancer's skills and preferences
- **Opportunity Score** — Quality and legitimacy of the posting
- **Win Probability** — Likelihood of winning the contract
- Skills gap analysis, budget fit assessment, competition analysis, and red flag detection
- A deterministic fallback scoring algorithm runs when no AI API key is configured

### AI Proposal Generator

Groq-hosted Llama 3.1 70B generates Upwork proposals using an extensively engineered system prompt that encodes business development strategy — including hook frameworks, competitive positioning tactics, pain-point extraction, and a structured 5-block proposal architecture. Supports both JSON output and real-time streaming via Server-Sent Events.

### Multi-Channel Notification Engine

A rule-based dispatcher evaluates user-configured channel rules against job scores and routes alerts through:
- **Email** (via Resend)
- **Telegram**
- **Slack** (Block Kit formatting)
- **Discord** (embeds)
- **Custom Webhooks**

Each channel delivers platform-native formatted messages with job scores, recommendations, and proposal tips.

### Chrome Extension (Manifest V3)

A side-panel Chrome extension that integrates directly into the Upwork browsing experience:
- Content scripts inject into Upwork pages to surface job data
- Session cookie management enables enriched client data fetching
- Displays AI scores and recommendations directly on job pages

### Next.js Dashboard

A full-featured web application with:
- Job browsing with advanced filters (type, budget, skills, category, experience tier)
- Saved jobs with favorites
- AI proposal management (generate, edit, copy)
- Notification channel configuration
- Job filter management with keyword, budget, and country targeting
- Live cron status monitoring
- CSV export for job data
- Upwork profile management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| **UI Components** | shadcn/ui, Radix UI, Lucide Icons |
| **State Management** | TanStack React Query, React Hook Form, Zod |
| **Backend API** | Next.js API Routes, Python FastAPI |
| **Database** | Supabase (PostgreSQL) with Row Level Security — 18 migrations |
| **Authentication** | Supabase Auth (SSR + CSR) |
| **AI Services** | OpenAI API (job scoring), Groq Cloud (proposal generation) |
| **Notifications** | Resend, Telegram Bot API, Slack Web API, Discord Webhooks |
| **Deployment** | Vercel (frontend), AWS EC2 (scraper + cron), Supabase Cloud |
| **Chrome Extension** | Manifest V3, Service Worker, Side Panel API, Content Scripts |
| **DevOps** | Docker, Nginx reverse proxy, systemd timers, Supabase CLI |

## Key Technical Highlights

- **Resilient AI pipeline** — Every AI call (scoring and proposals) has a deterministic fallback. The app works fully without any API keys, just with reduced analysis quality.
- **RLS-secured multi-tenant DB** — PostgreSQL Row Level Security policies ensure complete data isolation between users while a service role handles background ingestion.
- **Streaming proposal UI** — Server-Sent Events stream the AI's reasoning process and proposal text to the browser in real-time, creating an interactive generation experience.
- **Automated data enrichment** — Client details including spend history, hire rates, payment verification, company size, and industry are automatically fetched and stored for each new job.
- **Multi-format notifications** — The same job alert is rendered differently for each channel: HTML email, Telegram markdown, Slack Block Kit, Discord embeds, and raw webhook JSON.
