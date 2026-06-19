# Upwork Opportunity Finder - Technical Architecture Notes

## Project Goal

Build a SaaS platform that monitors relevant Upwork jobs, scores opportunities, sends alerts, and helps users generate better proposals.

---

# Core Objective

Help freelancers:

* Discover relevant jobs faster
* Avoid low-quality opportunities
* Receive instant notifications
* Generate higher-converting proposals
* Track application performance

---

# Recommended MVP Scope

### Include

* User Authentication
* Job Filters
* Job Monitoring
* Duplicate Detection
* Job Scoring
* Email Notifications
* Telegram Notifications
* AI Proposal Generator
* Chrome Extension Side Panel

### Exclude Initially

* WhatsApp Integration
* Auto Apply Features
* Advanced Analytics
* Browser Automation
* Complex CRM Features
* Team Accounts

---

# System Architecture

```text
Next.js Dashboard
        ↓
NestJS Backend API
        ↓
PostgreSQL Database

Worker Service
        ↓
BullMQ + Redis
        ↓
Job Fetcher
        ↓
Scoring Engine
        ↓
Notification Queue
        ↓
Email / Telegram
```

---

# User Authentication Flow

## User Signup

User creates an account through the web application.

### Frontend

```text
Next.js
```

### Backend

```text
NestJS
```

### Database

```text
PostgreSQL
```

### Users Table

```sql
users
------
id
name
email
password_hash
whatsapp_number
timezone
plan
created_at
updated_at
```

---

# Chrome Extension Authentication

## Login Flow

```text
Chrome Extension
        ↓
Backend API
        ↓
JWT Token
```

Store token inside:

```javascript
chrome.storage.local
```

Stored values:

```text
access_token
user_id
```

---

# Job Filters

Users can save custom filters.

Example:

```text
keywords:
- React
- Next.js
- SaaS

minimum_budget:
500

countries:
US
UK
Canada

maximum_proposals:
15

minimum_client_spend:
1000
```

API:

```http
POST /api/job-filters
```

Database:

```sql
job_filters
-----------
id
user_id
keywords
min_budget
max_budget
client_countries
min_client_spend
max_proposals
is_active
created_at
updated_at
```

---

# Job Monitoring Engine

## Background Worker

Runs independently from the browser.

```text
Cron Worker
        ↓
Load Active Filters
        ↓
Fetch Jobs
        ↓
Normalize Data
        ↓
Check Duplicates
        ↓
Save New Jobs
```

### Technologies

```text
BullMQ
Redis
Cron Jobs
Queue Workers
```

Important:

```text
Browser should not be required.
Worker must continue running even when user is offline.
```

---

# Job Data Sources

## Option A — Official API

Preferred solution.

```text
Backend
    ↓
Official Upwork API
    ↓
Jobs
```

Advantages:

* Stable
* Scalable
* Lower risk

---

## Option B — Search URL Polling

```text
Backend
    ↓
Search URL
    ↓
Parse Results
```

Risks:

* Rate limiting
* Blocking
* Terms of service concerns

---

## Option C — Browser Assisted

```text
Upwork Page
        ↓
Extension Content Script
        ↓
Backend
```

Use only as a supplement.

Should never be the primary data source.

---

# Duplicate Detection

Every job must have a unique identifier.

Examples:

```text
upwork_job_id
url_hash
```

Flow:

```text
New Job
    ↓
Check Database
    ↓
Already Exists?
        ↓
Yes → Skip
No  → Save
```

Jobs table:

```sql
jobs
----
id
upwork_job_id
title
description
budget
hourly_min
hourly_max
client_country
client_spend
client_hire_rate
proposals_count
url
posted_at
created_at
```

---

# Job Scoring Engine

## Purpose

Rank opportunities before notifying users.

---

## Match Score

Measures:

```text
Keyword Match
Skill Match
Budget Match
Category Match
Experience Match
```

Example:

```text
React Match
Next.js Match
TypeScript Match
SaaS Match
```

---

## Opportunity Score

Measures:

```text
Payment Verification
Client Spend
Client Hire Rate
Proposal Competition
Budget Quality
Job Clarity
```

---

## Job Scores Table

```sql
job_scores
----------
id
job_id
user_id
match_score
opportunity_score
win_probability
recommendation
created_at
```

---

# Alert Decision Engine

Do not alert users for every job.

Example rules:

```text
match_score >= 75

AND

opportunity_score >= 70

AND

proposals_count <= 20
```

Flow:

```text
Scored Job
        ↓
Rule Engine
        ↓
Qualified?
        ↓
Create Notification
```

---

# Notifications

## MVP Channels

### Email

Recommended.

### Telegram

Recommended.

---

## Future Channels

* WhatsApp
* Chrome Push
* SMS

---

## Notification Queue

```text
Notification Queue
        ↓
Email Sender
        ↓
Telegram Sender
        ↓
Update Status
```

Database:

```sql
notifications
-------------
id
user_id
job_id
channel
status
sent_at
created_at
```

---

# Example Alert

```text
New High Match Upwork Job

Title:
React SaaS Developer

Match Score:
91%

Opportunity Score:
84%

Budget:
$1200

Proposals:
Less than 10

Recommendation:
Apply Immediately
```

---

# Job Analysis Extension

## User Opens Job

```text
User Opens Upwork Job
        ↓
Content Script Reads Page
        ↓
Send Data To Backend
        ↓
AI Analysis
        ↓
Return Results
        ↓
Show Side Panel
```

---

# Extension Components

```text
manifest.json

background.js

content-script.js

side-panel UI
```

---

# AI Proposal Generator

Flow:

```text
Job Description
        +
User Profile
        +
Portfolio Data
        +
Winning Proposal Examples
        ↓
AI Service
        ↓
Proposal Draft
```

API:

```http
POST /api/proposals/generate
```

Database:

```sql
proposals
---------
id
user_id
job_id
generated_text
final_text
score
created_at
```

---

# Proposal Review Engine

Input:

```text
Proposal Text
```

Output:

```text
Personalization Score

Clarity Score

CTA Strength

Generic Content Detection

Improvement Suggestions
```

Example:

```text
Personalization: 80

Clarity: 90

CTA: Weak

Generic Content: No

Recommended Changes: 3
```

---

# Complete User Journey

```text
User Signup
        ↓
Install Chrome Extension
        ↓
Save Filters
        ↓
Background Worker Monitors Jobs
        ↓
New Job Found
        ↓
Duplicate Check
        ↓
Job Saved
        ↓
Score Generated
        ↓
Rule Engine
        ↓
Notification Sent
        ↓
User Opens Job
        ↓
AI Analysis
        ↓
Proposal Generated
        ↓
User Applies
        ↓
Application Tracked
        ↓
System Learns From Outcomes
```

---

# Recommended Tech Stack

## Frontend

```text
Next.js
Tailwind CSS
shadcn/ui
```

## Browser Extension

```text
Chrome MV3
TypeScript
```

## Backend

```text
NestJS
```

## Database

```text
PostgreSQL
Prisma ORM
```

## Queue

```text
Redis
BullMQ
```

## AI

```text
OpenAI API
```

## Notifications

```text
Email
Telegram Bot
```

## Hosting

```text
AWS
Railway
Render
```

---

# Biggest Product Risk

## Critical Warning

The entire product depends on a reliable and compliant Upwork job data source.

Validation order:

```text
1. Verify legal and reliable job data access.

2. Verify scoring quality.

3. Verify alert usefulness.

4. Verify proposal generation value.

5. Scale infrastructure only after validation.
```

If the job source becomes unavailable, the entire platform loses value regardless of how good the dashboard, extension, or AI features are.
