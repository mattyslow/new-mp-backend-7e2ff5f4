-- ============================================
-- PICKLEBALL PLATFORM - SCHEMA MIGRATION
-- Run this in your new external Supabase project
-- ============================================

-- ============================================
-- 1. CREATE REFERENCE TABLES
-- ============================================

-- Levels table
CREATE TABLE public.levels (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Categories table
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Locations table
CREATE TABLE public.locations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seasons table
CREATE TABLE public.seasons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 2. CREATE CORE TABLES
-- ============================================

-- Players table
CREATE TABLE public.players (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    credit NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Packages table
CREATE TABLE public.packages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    location_id UUID REFERENCES public.locations(id),
    original_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Programs table
CREATE TABLE public.programs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    max_registrations INTEGER NOT NULL DEFAULT 0,
    level_id UUID REFERENCES public.levels(id),
    category_id UUID REFERENCES public.categories(id),
    location_id UUID REFERENCES public.locations(id),
    season_id UUID REFERENCES public.seasons(id),
    original_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Programs-Packages junction table
CREATE TABLE public.programs_packages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Registrations table
CREATE TABLE public.registrations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.packages(id),
    program_id UUID REFERENCES public.programs(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_programs_date ON public.programs(date);
CREATE INDEX idx_programs_level_id ON public.programs(level_id);
CREATE INDEX idx_programs_category_id ON public.programs(category_id);
CREATE INDEX idx_programs_location_id ON public.programs(location_id);
CREATE INDEX idx_programs_season_id ON public.programs(season_id);
CREATE INDEX idx_registrations_player_id ON public.registrations(player_id);
CREATE INDEX idx_registrations_program_id ON public.registrations(program_id);
CREATE INDEX idx_registrations_package_id ON public.registrations(package_id);
CREATE INDEX idx_packages_location_id ON public.packages(location_id);
CREATE INDEX idx_programs_packages_program_id ON public.programs_packages(program_id);
CREATE INDEX idx_programs_packages_package_id ON public.programs_packages(package_id);
CREATE INDEX idx_players_email ON public.players(email);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE USER ROLES SYSTEM
-- ============================================

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'player');

-- Create user roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create player profiles table (links auth.users to players)
CREATE TABLE public.player_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE SECURITY HELPER FUNCTIONS
-- ============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Function to get player_id for current user
CREATE OR REPLACE FUNCTION public.get_player_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT player_id 
  FROM public.player_profiles 
  WHERE user_id = auth.uid()
$$;

-- ============================================
-- 7. CREATE RLS POLICIES - ADMIN ACCESS
-- ============================================

-- Reference tables: Admins have full access, public read
CREATE POLICY "Admins can manage levels" ON public.levels
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can read levels" ON public.levels
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can read categories" ON public.categories
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Admins can manage locations" ON public.locations
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can read locations" ON public.locations
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Admins can manage seasons" ON public.seasons
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can read seasons" ON public.seasons
    FOR SELECT TO anon, authenticated
    USING (true);

-- ============================================
-- 8. CREATE RLS POLICIES - PLAYERS
-- ============================================

-- Players: Admins full access, players can read their own
CREATE POLICY "Admins can manage players" ON public.players
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Players can view their own profile" ON public.players
    FOR SELECT TO authenticated
    USING (id = public.get_player_id());

-- ============================================
-- 9. CREATE RLS POLICIES - PROGRAMS & PACKAGES
-- ============================================

-- Programs: Admins manage, everyone can read
CREATE POLICY "Admins can manage programs" ON public.programs
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can read programs" ON public.programs
    FOR SELECT TO anon, authenticated
    USING (true);

-- Packages: Admins manage, everyone can read
CREATE POLICY "Admins can manage packages" ON public.packages
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can read packages" ON public.packages
    FOR SELECT TO anon, authenticated
    USING (true);

-- Programs-Packages junction: Admins manage, everyone can read
CREATE POLICY "Admins can manage programs_packages" ON public.programs_packages
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can read programs_packages" ON public.programs_packages
    FOR SELECT TO anon, authenticated
    USING (true);

-- ============================================
-- 10. CREATE RLS POLICIES - REGISTRATIONS
-- ============================================

-- Registrations: Admins full access, players can manage their own
CREATE POLICY "Admins can manage registrations" ON public.registrations
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Players can view their registrations" ON public.registrations
    FOR SELECT TO authenticated
    USING (player_id = public.get_player_id());

CREATE POLICY "Players can create their own registrations" ON public.registrations
    FOR INSERT TO authenticated
    WITH CHECK (player_id = public.get_player_id());

CREATE POLICY "Players can delete their own registrations" ON public.registrations
    FOR DELETE TO authenticated
    USING (player_id = public.get_player_id());

-- ============================================
-- 11. CREATE RLS POLICIES - USER ROLES
-- ============================================

CREATE POLICY "Admins can manage user_roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- 12. CREATE RLS POLICIES - PLAYER PROFILES
-- ============================================

CREATE POLICY "Admins can manage player_profiles" ON public.player_profiles
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own profile" ON public.player_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- Next steps:
-- 1. Import your data from the current database
-- 2. Create your first admin user and assign the 'admin' role
-- 3. Connect both Lovable projects to this Supabase instance
