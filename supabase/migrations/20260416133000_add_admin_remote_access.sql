-- ================================================
-- ADMIN REMOTE ACCESS TABLES
-- Separate admin device catalog and audit trail
-- ================================================

CREATE TABLE IF NOT EXISTS public.admin_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  mesh_node_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'windows' CHECK (platform IN ('windows', 'macos', 'linux', 'other')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  device_id UUID REFERENCES public.admin_devices(id) ON DELETE SET NULL,
  admin_username TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_devices_enabled_sort
  ON public.admin_devices(enabled, sort_order, label);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON public.admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_device_id
  ON public.admin_audit_logs(device_id);

ALTER TABLE public.admin_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_devices (label, mesh_node_id, platform, sort_order, enabled)
VALUES
  ('Desktop', 'REPLACE_WITH_DESKTOP_NODE_ID', 'windows', 1, true),
  ('Laptop', 'REPLACE_WITH_LAPTOP_NODE_ID', 'windows', 2, true)
ON CONFLICT (label) DO NOTHING;
