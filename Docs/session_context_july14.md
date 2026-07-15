# Surrounding.io — Complete Session Context (July 14, 2026)

This document captures the full state of the project and all decisions made during this session. Any new agent session should read this file first.

---

## 1. Project Overview

**surrounding.io** is a proximity-based social discovery app with the slogan *"Mutual connections discovery by DMs."*

### Tech Stack (Current)
- **Frontend**: Next.js 16.1.6 (App Router) + TypeScript + Tailwind CSS v4
- **Map**: Leaflet via `react-leaflet`
- **D3.js Visualization**: Standalone `public/connections.html` (v14.4 Golden Baseline) embedded via iframe
- **Backend**: Next.js API Routes (currently only `/api/pass` for PASS engine)
- **Auth**: Mock auth (simulated social logins)
- **Database**: None yet — all state is in-memory React state

### Tech Stack (Decided for Backend — NOT YET IMPLEMENTED)
- **Database**: **Supabase** (PostgreSQL + PostGIS + Realtime + Storage + Auth)
- **Hosting**: Hostinger Business Plan (3GB RAM) for Next.js, with Supabase Cloud handling all heavy data
- **Real-time**: Supabase Realtime (replaces the originally planned Socket.io + Redis)
- **Photo Storage**: Supabase Storage CDN (not Hostinger disk)

---

## 2. The Four Core Features (Bottom Tab Bar)

| Tab | Icon | Status | Description |
|-----|------|--------|-------------|
| **Radar** | Radar square | ✅ Built (frontend) | Leaflet map with proximity dots, synthetic sonar, user discovery |
| **Photo Pins** | MapPinned | ✅ Built (frontend + mock backend) | PASS engine — camera → AI tags → score → pin drop |
| **Chat** | MessageSquare | ✅ Built (frontend mock) | Glassmorphic chat overlay with simulated typing/replies |
| **Connections** | Share2 | ✅ Just integrated this session | D3.js mutual connection graph (replaced old "Profile" tab) |

---

## 3. Key Files & Their Purposes

### Source Code
- `src/app/page.tsx` — Main app shell with all 4 tab views, chat overlay, PASS modal, auth
- `src/components/map.tsx` — Leaflet map component (Radar tab)
- `src/components/theme-toggle.tsx` — Dark/Light theme toggle using `next-themes`
- `src/components/theme-provider.tsx` — Theme context provider
- `src/app/api/pass/route.ts` — PASS scoring engine (currently returns mock AI tags)
- `src/app/globals.css` — Tailwind + custom CSS variables
- `public/connections.html` — **The D3.js mutual connection visualization (v14.4)**

### Documentation (Docs/)
- `MutualConnection.md` — v14.4 Golden Baseline handoff doc. Contains all physics rules, business logic, technical walkthroughs of hard bug fixes, and changelog. **Most bugs listed are ALREADY FIXED in the current connections.html.**
- `session_summary.md` — Previous session: PASS gamification integration
- `implementation_plan.md.resolved` — Original architecture plan (tiered visibility, matchmaking, geofencing, AI personas)
- `ollama.surrounding.io.md` — PASS engine scoring algorithm specification (object detection, theme coherence, composition, rarity)
- `brainstorming_context.md` — Quick context notes (now superseded by this file)
- `antigravity_conversation_history_fix.md` — Guide for migrating IDE conversation history between machines (completed successfully this session)

---

## 4. Supabase Backend Architecture (APPROVED — Ready to Implement)

### Architecture Diagram
```
              ┌────────────────────────┐
              │   User's Web Browser   │
              └────┬──────────────┬────┘
                   │              │
  Heavy/Live Traffic│              │ Server Actions, Admin
  (Chat, Maps, Auth)│              │
                   ▼              ▼
          ┌────────────────┐   ┌───────────────────────────┐
          │ Supabase Cloud │   │ Hostinger Business Plan   │
          │  (Postgres +   │   │     (Next.js App Engine)  │
          │ Realtime + CDN)│   └───────────────────────────┘
          └────────────────┘
```

### Database Schema (Agreed Upon)

#### Profiles Table
```sql
create extension if not exists "uuid-ossp";
create extension if not exists postgis;

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  location geography(Point, 4326),
  created_at timestamptz default now()
);

create index idx_profiles_location on public.profiles using gist(location);
```

#### Social Connections Table
```sql
create table public.connections (
  id bigint generated always as identity primary key,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  addressee_id uuid references public.profiles(id) on delete cascade not null,
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz default now(),
  constraint cannot_connect_self check (requester_id <> addressee_id),
  constraint unique_connection_pair unique (requester_id, addressee_id)
);

create index idx_connections_requester on public.connections(requester_id);
create index idx_connections_addressee on public.connections(addressee_id);
create index idx_connections_status on public.connections(status);
```

#### Photo Pins Table (for PASS system)
```sql
create table public.photo_pins (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  location geography(Point, 4326) not null,
  image_url text not null,
  pass_score numeric(5,1) not null,
  pass_tags jsonb,
  pro_tip text,
  created_at timestamptz default now()
);

create index idx_pins_location on public.photo_pins using gist(location);
create index idx_pins_score on public.photo_pins(pass_score desc);
```

### Key Database Functions (Agreed Upon)

#### Nearby User Discovery
```sql
create or replace function public.find_nearby_users(
  current_lng float, current_lat float, radius_meters float
)
returns table (id uuid, username text, avatar_url text, distance_meters float)
language sql security invoker as $$
  select id, username, avatar_url,
    st_distance(location, st_makepoint(current_lng, current_lat)::geography) as distance_meters
  from public.profiles
  where st_dwithin(location, st_makepoint(current_lng, current_lat)::geography, radius_meters)
  order by distance_meters asc;
$$;
```

#### Bidirectional Connection Query
```sql
create or replace function public.get_user_connections(user_id uuid)
returns table (connected_user_id uuid, username text, avatar_url text)
language sql security invoker as $$
  select p.id, p.username, p.avatar_url
  from public.connections c
  join public.profiles p on p.id = case
    when c.requester_id = user_id then c.addressee_id
    else c.requester_id
  end
  where (c.requester_id = user_id or c.addressee_id = user_id)
    and c.status = 'accepted';
$$;
```

#### Mutual Connections (for D3.js graph)
```sql
create or replace function public.find_mutual_connections(user_a uuid, user_b uuid)
returns table (mutual_id uuid, username text, avatar_url text)
language sql security invoker as $$
  select p.id, p.username, p.avatar_url
  from public.profiles p
  where p.id in (select connected_user_id from get_user_connections(user_a))
    and p.id in (select connected_user_id from get_user_connections(user_b));
$$;
```

---

## 5. What Was Done This Session

1. **Git pull** from main (discarded local changes, pulled latest)
2. **Fixed Turbopack crash** — cleared corrupted `.next` cache
3. **Fixed lightningcss ARM64 error** — installed `lightningcss-win32-arm64-msvc`
4. **Moved `MutualConnection.md`** to `Docs/` folder
5. **Migrated conversation history** from old Intel computer's `state.vscdb` to new ARM machine using a scheduled task that merged Protobuf `trajectorySummaries` after IDE exit
6. **Integrated `connections.html`** — replaced the "Profile" bottom tab with a "Connections" tab that loads the D3.js visualization in an iframe with automatic theme synchronization
7. **Read all Docs/** — fully familiarized with project state
8. **Evaluated and approved Supabase** as the backend database engine

---

## 6. Outstanding TODO (For Next Session)

### Immediate (Backend Deep Dive)
- [ ] Set up Supabase project and configure environment variables
- [ ] Install `@supabase/supabase-js` and `@supabase/ssr` packages
- [ ] Execute the SQL schema (profiles, connections, photo_pins) in Supabase dashboard
- [ ] Create the PostGIS functions (find_nearby_users, get_user_connections, find_mutual_connections)
- [ ] Set up Row Level Security (RLS) policies
- [ ] Replace mock auth with Supabase Auth (social providers: Google, GitHub, LinkedIn, Facebook, Twitter)
- [ ] Wire up the Radar tab to query `find_nearby_users` with real geolocation
- [ ] Wire up the Chat tab to Supabase Realtime subscriptions
- [ ] Wire up Photo Pins to Supabase Storage + `photo_pins` table
- [ ] Wire up Connections tab to pull real connection graph data from `get_user_connections`

### Future
- [ ] Swap PASS mock AI with real Vision API (OpenAI GPT-4o or Google Cloud Vision)
- [ ] Implement "Turf War" logic (overwrite pin if higher PASS score at same GPS)
- [ ] Implement tiered visibility system (T1-T4 with reciprocity rule, 24h auto-reset)
- [ ] Implement AI Personas (digital agents that handle connection requests)
- [ ] Implement real-time geofencing with proximity alerts
- [ ] Logo finalization (10 concepts generated, selection pending)
- [ ] Capacitor wrapping for App Store / Play Store

---

## 7. Environment Notes

- **Machine**: Windows ARM64 (Surface/Snapdragon)
- **Username**: `Dave` (path: `C:\Users\Dave`)
- **Python**: `C:\Program Files\Python313-arm64\python.exe`
- **Node**: Installed (runs Next.js 16.1.6)
- **Git Remote**: `https://github.com/analyst-dave/surrounding.io`
- **Dev Server**: `npm run dev` → `http://localhost:3000`
- **Known ARM64 Fix**: Must have `lightningcss-win32-arm64-msvc` installed for Tailwind CSS v4
