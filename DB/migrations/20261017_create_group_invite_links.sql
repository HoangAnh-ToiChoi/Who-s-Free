-- Migration: Create group_invite_links table
-- Date: 2026-10-17

BEGIN;

CREATE TABLE IF NOT EXISTS public.group_invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_invite_links_group_id ON public.group_invite_links (group_id);
CREATE INDEX IF NOT EXISTS idx_group_invite_links_token ON public.group_invite_links (token);

ALTER TABLE public.group_invite_links ENABLE ROW LEVEL SECURITY;

COMMIT;
