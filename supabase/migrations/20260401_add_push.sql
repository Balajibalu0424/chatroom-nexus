-- ================================================
-- PUSH NOTIFICATIONS
-- ================================================

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Index for push subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy - users can manage their own subscriptions
CREATE POLICY "push_subscriptions_all" ON public.push_subscriptions FOR ALL USING (true);

-- Realtime for push subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;

-- ================================================
-- FUNCTION: Send push notification (for use in triggers/functions)
-- ================================================

CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  -- Get all push subscriptions for the user
  FOR v_subscription IN 
    SELECT endpoint, keys 
    FROM push_subscriptions 
    WHERE user_id = p_user_id
  LOOP
    -- In a real implementation, you would call a push service here
    -- For Supabase, you'd typically use a Edge Function or external service
    RAISE NOTICE 'Would send push to: %', v_subscription.endpoint;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
