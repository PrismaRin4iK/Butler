-- Migration: Initial Schema for Smart Backlog ("Butler")
-- Creates profiles, backlog_items, RLS policies, and auth trigger

-- 1. Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  google_refresh_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Backlog Items Table
CREATE TABLE IF NOT EXISTS public.backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('youtube', 'article', 'custom_task')),
  title TEXT NOT NULL,
  url TEXT,
  raw_content TEXT,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_minutes INTEGER NOT NULL DEFAULT 15,
  energy_level TEXT NOT NULL CHECK (energy_level IN ('low', 'medium', 'high')),
  ai_summary TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'completed', 'dismissed', 'archived')),
  last_suggested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_backlog_items_user_status ON public.backlog_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_backlog_items_energy ON public.backlog_items(energy_level);
CREATE INDEX IF NOT EXISTS idx_backlog_items_suggested ON public.backlog_items(last_suggested_at);

-- 3. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Backlog Items Policies
CREATE POLICY "Users can select own backlog items"
  ON public.backlog_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backlog items"
  ON public.backlog_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own backlog items"
  ON public.backlog_items
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own backlog items"
  ON public.backlog_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Automatic profile creation on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_backlog_item_updated ON public.backlog_items;
CREATE TRIGGER on_backlog_item_updated
  BEFORE UPDATE ON public.backlog_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
