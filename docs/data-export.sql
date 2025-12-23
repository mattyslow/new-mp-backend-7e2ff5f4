-- ============================================
-- DATA EXPORT QUERIES
-- Run these in the current Lovable Cloud backend
-- to get INSERT statements for your data
-- ============================================

-- Note: For large datasets (like your 606 players, 1273 programs, etc.)
-- you'll want to use CSV export/import instead.
-- These queries are provided for reference.

-- ============================================
-- REFERENCE DATA (Small tables - can use INSERT)
-- ============================================

-- Levels (14 records)
INSERT INTO public.levels (id, name, created_at) VALUES
('a7c93672-b90f-490d-b114-b3a5f8db8cd2', 'Beginner', '2025-12-22 20:59:38.483717+00'),
('8616b43d-f268-4049-ad08-9a2e807b647e', 'Advanced Beginner/Intermediate (2.0-3.0)', '2025-12-22 20:59:51.230042+00'),
('15d2d427-5eec-4b2d-8b98-140a7cbeeade', 'High Intermediate (3.0-3.5)', '2025-12-22 20:59:59.587285+00'),
('e3f2dc6a-ee43-4f1d-b893-e391fb06821a', 'Advanced (3.5-4.0)', '2025-12-22 21:00:07.137501+00'),
('fdc3efde-6a2f-41da-baf1-8b008dcfac4d', 'Expert (4.0+)', '2025-12-22 21:00:13.770823+00'),
('21eb0f97-fb24-4af8-94d2-aa273270965b', 'Expert (4.5+)', '2025-12-22 21:00:18.465002+00'),
('d13c83b8-8242-4e4d-87a6-4a691eb881aa', 'Beginner (50+ Only)', '2025-12-23 01:11:29.70813+00'),
('cb945f47-a971-461b-bdac-e28047db8772', 'Singles Open Play - Advanced (3.5+)', '2025-12-23 01:11:30.044638+00'),
('a498f5e0-2327-4f8e-a6d5-b871269f0435', 'Beginner 9-13 Year Olds', '2025-12-23 01:11:30.338081+00'),
('dab313c5-9ea0-4daa-8898-1629ecb9bf9d', 'Intermediate 9-13 Year Olds', '2025-12-23 01:11:30.632448+00'),
('e5641a29-6c0d-4dc5-9b59-a37b4354581e', 'Advanced (3.5+)', '2025-12-23 01:11:30.938395+00'),
('1f14390c-ead5-41bd-837b-e59274e781c7', 'Womens 3.75-4.25 Drill & Play', '2025-12-23 01:11:31.220044+00'),
('6f573e6a-20a6-4491-b770-1ecb9b591cda', 'Advanced (3.25-4.0)', '2025-12-23 01:11:31.515678+00'),
('52a73e4b-8a63-46c8-b473-d3aae0f1130e', 'Expert (4.0-4.5)', '2025-12-23 01:11:31.814+00');

-- Categories (8 records)
INSERT INTO public.categories (id, name, created_at) VALUES
('6193d5d1-be13-4534-b408-142fe8471fa9', 'Adult Clinics', '2025-12-22 21:00:26.085162+00'),
('cd4b523d-c093-40cb-8cb4-14312bb55a36', 'Open Play', '2025-12-22 21:00:29.299733+00'),
('d5b9632c-e11e-44ab-91e1-61ceb563b432', 'Guided Open Play', '2025-12-22 21:00:35.365475+00'),
('812cc50a-77ea-410a-9f2d-7ad6d2dceda3', 'Play With Pro', '2025-12-22 21:00:40.912037+00'),
('aa97a14e-6e17-4833-9128-26f6d7a8957b', 'Guided Drilling', '2025-12-22 21:00:51.26124+00'),
('12aefa01-e2df-4569-93ea-d3bdd756d74b', 'Kids Clinics', '2025-12-23 01:39:20.528098+00'),
('698d65f8-19f0-4bb2-beda-8785e747f76d', 'Drill & Play', '2025-12-23 01:39:21.096445+00'),
('e6c9d1ba-ea37-4ed9-8f7d-475ec639afa3', 'Advanced Adult Camp', '2025-12-23 01:39:21.467101+00');

-- Locations (2 records)
INSERT INTO public.locations (id, name, created_at) VALUES
('4ff772e1-e518-4bc9-bd01-4b1bd3da0ff0', 'Fair Lawn', '2025-12-22 21:00:58.578118+00'),
('e7b31ba1-253c-422f-ad73-69bb09e05739', 'Montclair', '2025-12-22 21:01:01.26945+00');

-- Seasons (3 records)
INSERT INTO public.seasons (id, name, created_at) VALUES
('301adfc3-d975-4b42-a1c3-de317bf4b98f', 'Winter 2025-2026', '2025-12-22 21:01:07.936506+00'),
('b349356c-f183-414e-b6a5-b4ddcc6418d8', 'Fall 2025', '2025-12-22 21:01:11.158196+00'),
('832132ef-50a7-4b13-b28a-3676b1841a79', 'Spring 2026', '2025-12-22 21:01:16.280616+00');

-- ============================================
-- LARGE TABLES - USE CSV EXPORT
-- ============================================

-- For players (606 records), programs (1,273 records), 
-- packages (680 records), registrations (2,372 records),
-- and programs_packages:
--
-- 1. In Supabase Dashboard, go to Table Editor
-- 2. Select each table
-- 3. Click "Export" → "Export as CSV"
-- 4. In new Supabase project, use "Import" → upload CSV
--
-- Import order (important for foreign keys):
-- 1. levels, categories, locations, seasons (reference tables)
-- 2. players
-- 3. packages
-- 4. programs  
-- 5. programs_packages
-- 6. registrations
