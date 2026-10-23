-- Creates the table required by the email group invitation API.
-- Safe to run more than once. Requires public.users and public.groups to exist.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.group_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_invitations_token_hash
    ON public.group_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_status
    ON public.group_invitations(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_email
    ON public.group_invitations(email);

ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

COMMIT;
