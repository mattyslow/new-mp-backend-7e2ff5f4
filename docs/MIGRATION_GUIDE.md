# Migration Guide: External Supabase Setup

This guide will help you migrate from Lovable Cloud to an external Supabase project so both your **Admin App** and **Player-Facing App** can share the same database.

## Current Database Stats
- **Players**: 606 records
- **Programs**: 1,273 records  
- **Packages**: 680 records
- **Registrations**: 2,372 records

---

## Step 1: Create External Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click **"New Project"**
3. Choose your organization
4. Set a project name (e.g., `pickleball-platform`)
5. Set a strong database password (save this!)
6. Choose a region close to your users
7. Click **"Create new project"**
8. Wait for the project to be ready (~2 minutes)

---

## Step 2: Run Schema Migration

In your new Supabase project:
1. Go to **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Copy and paste the entire contents of `docs/schema-migration.sql`
4. Click **"Run"**

---

## Step 3: Export Data from Current Database

Since you have a significant amount of data, you'll need to export it. Use the Supabase CLI or the Data Export feature:

### Option A: Use Supabase Dashboard (Recommended for smaller datasets)
1. In your **current** Lovable Cloud backend, export each table as CSV
2. Import them into the new Supabase project

### Option B: Use pg_dump (For larger datasets)
Contact Lovable support to get a database dump, or use the data export scripts below.

---

## Step 4: Connect Admin App to External Supabase

In your **Admin App** Lovable project:

1. Go to **Settings** → **Integrations**
2. Click **"Connect to Supabase"**
3. Enter your external Supabase project credentials:
   - **Project URL**: `https://[your-project-ref].supabase.co`
   - **Anon Key**: Found in Supabase Dashboard → Settings → API → `anon` `public`
4. Save the connection

---

## Step 5: Create Player App with Same Database

1. Create a **new Lovable project** for the Player App
2. In the new project, go to **Settings** → **Integrations**
3. Click **"Connect to Supabase"**
4. Enter the **same** credentials as Step 4
5. Now both apps share the same database!

---

## Step 6: Update Environment Variables

Both projects will need these environment variables:

```env
VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

---

## Step 7: Security Considerations

For the **Player App**, you'll want stricter RLS policies. See `docs/player-rls-policies.sql` for player-specific policies that:
- Allow players to only see their own registrations
- Allow public read access to programs/packages
- Require authentication for registration actions

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    External Supabase                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   PostgreSQL                         │    │
│  │  - players, programs, packages, registrations       │    │
│  │  - RLS policies for access control                  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────┐        ┌─────────────────────────┐    │
│  │  Auth (Admins)  │        │   Auth (Players)        │    │
│  │  - Email/Pass   │        │   - Magic Link          │    │
│  └─────────────────┘        └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
    ┌──────────────┐            ┌──────────────────┐
    │  Admin App   │            │  Player App      │
    │  (Lovable)   │            │  (Lovable)       │
    │              │            │                  │
    │ - Dashboard  │            │ - Browse Programs│
    │ - CRUD Ops   │            │ - Register       │
    │ - Reports    │            │ - My Account     │
    └──────────────┘            └──────────────────┘
```

---

## Need Help?

- Export large datasets: Use Supabase CLI `supabase db dump`
- RLS issues: Check browser console for policy errors
- Connection issues: Verify URL and API keys match exactly
