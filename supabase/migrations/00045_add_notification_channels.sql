-- Add WhatsApp, n8n, Make, and Zapier as notification channel types.

ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'whatsapp';
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'n8n';
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'make';
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'zapier';