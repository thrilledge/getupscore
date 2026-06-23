/**
 * Static filter options extracted from Upwork search page sidebar.
 * These cannot be fetched via GraphQL without OAuth scope.
 */

// ─── Categories (with subcategories) ───

export const CATEGORIES = [
  {
    label: "Accounting & Consulting",
    subcategories: [
      "Personal & Professional Coaching", "Accounting & Bookkeeping", "Financial Planning",
      "Recruiting & Human Resources", "Management Consulting & Analysis", "Other - Accounting & Consulting",
    ],
  },
  {
    label: "Admin Support",
    subcategories: [
      "Data Entry & Transcription Services", "Virtual Assistance", "Project Management", "Market Research & Product Reviews",
    ],
  },
  {
    label: "Customer Service",
    subcategories: [
      "Community Management & Tagging", "Customer Service & Tech Support",
    ],
  },
  {
    label: "Data Science & Analytics",
    subcategories: [
      "Data Analysis & Testing", "Data Extraction/ETL", "Data Mining & Management", "AI & Machine Learning",
    ],
  },
  {
    label: "Design & Creative",
    subcategories: [
      "Art & Illustration", "Audio & Music Production", "Branding & Logo Design",
      "NFT, AR/VR & Game Art", "Graphic, Editorial & Presentation Design", "Performing Arts",
      "Photography", "Product Design", "Video & Animation",
    ],
  },
  {
    label: "Engineering & Architecture",
    subcategories: [
      "Building & Landscape Architecture", "Chemical Engineering", "Civil & Structural Engineering",
      "Contract Manufacturing", "Electrical & Electronic Engineering", "Interior & Trade Show Design",
      "Energy & Mechanical Engineering", "Physical Sciences", "3D Modeling & CAD",
    ],
  },
  {
    label: "IT & Networking",
    subcategories: [
      "Database Management & Administration", "ERP/CRM Software", "Information Security & Compliance",
      "Network & System Administration", "DevOps & Solution Architecture",
    ],
  },
  {
    label: "Legal",
    subcategories: [
      "Corporate & Contract Law", "International & Immigration Law", "Finance & Tax Law", "Public Law",
    ],
  },
  {
    label: "Sales & Marketing",
    subcategories: [
      "Digital Marketing", "Lead Generation & Telemarketing", "Marketing, PR & Brand Strategy",
    ],
  },
  {
    label: "Translation",
    subcategories: [
      "Language Tutoring & Interpretation", "Translation & Localization Services",
    ],
  },
  {
    label: "Web, Mobile & Software Dev",
    subcategories: [
      "Blockchain, NFT & Cryptocurrency", "AI Apps & Integration", "Desktop Application Development",
      "Ecommerce Development", "Game Design & Development", "Mobile Development",
      "Other - Software Development", "Product Management & Scrum", "QA Testing",
      "Scripts & Utilities", "Web & Mobile Design", "Web Development",
    ],
  },
  {
    label: "Writing",
    subcategories: [
      "Sales & Marketing Copywriting", "Content Writing", "Editing & Proofreading Services", "Professional & Business Writing",
    ],
  },
] as const

// ─── Experience Level ───

export const EXPERIENCE_LEVELS = [
  { label: "Entry Level", value: "EntryLevel" },
  { label: "Intermediate", value: "IntermediateLevel" },
  { label: "Expert", value: "ExpertLevel" },
] as const

// ─── Job Type ───

export const JOB_TYPES = [
  { label: "Hourly", value: "HOURLY" },
  { label: "Fixed Price", value: "FIXED" },
] as const

// ─── Fixed Price Budget Ranges (from Upwork sidebar) ───

export const FIXED_PRICE_RANGES = [
  { label: "Less than $100", value: "0-99" },
  { label: "$100 to $500", value: "100-499" },
  { label: "$500 - $1K", value: "500-999" },
  { label: "$1K - $5K", value: "1000-4999" },
  { label: "$5K+", value: "5000-" },
] as const

// ─── Hourly Rate Ranges (from Upwork sidebar) ───
// Custom min/max inputs, no predefined ranges visible in HTML

// ─── Client History ───

export const CLIENT_HISTORY = [
  { label: "No hires", value: "no-hires" },
  { label: "1 to 9 hires", value: "1-9-hires" },
  { label: "10+ hires", value: "10-plus-hires" },
] as const

// ─── Project Length ───

export const PROJECT_LENGTHS = [
  { label: "Less than one month", value: "less-than-1-month" },
  { label: "1 to 3 months", value: "1-3-months" },
  { label: "3 to 6 months", value: "3-6-months" },
  { label: "More than 6 months", value: "6-plus-months" },
] as const

// ─── Hours Per Week (Workload) ───

export const WORKLOAD_OPTIONS = [
  { label: "Less than 30 hrs/week", value: "PART_TIME" },
  { label: "More than 30 hrs/week", value: "FULL_TIME" },
] as const

// ─── Contract to Hire ───

export const CONTRACT_TO_HIRE = [
  { label: "Contract-to-hire roles", value: "true" },
] as const

// ─── Helpers ───

export function getSubcategories(categoryLabel: string): string[] {
  const cat = CATEGORIES.find((c) => c.label === categoryLabel)
  return (cat?.subcategories ?? []) as string[]
}

export { CATEGORIES as CATEGORIES_LIST }
