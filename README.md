# Ashleigh's Korean Study Quest 🗝️

A tiny accountability site for Ashleigh (student) + Sungmin (checker) to track weekly
TOPIK study on [MasterTopik course 49](https://www.mastertopik.com/courses/49).

- Submit screenshot proof of each watched lesson
- Checker stamps it (🔥 / 💯 / 🌟 / 👍 / 🏆 / 💖) and leaves a comment
- Realtime updates, streak counter, stamp collection — game vibes
- Built with Vite + React + TypeScript + Tailwind + Supabase

## One-time setup (~10 min)

### 1. Create a Supabase project
Go to <https://supabase.com> → New project (free tier is fine). Wait for it to provision.

### 2. Apply the schema
In Supabase Dashboard → **SQL Editor** → paste the contents of
[`supabase/schema.sql`](supabase/schema.sql) → Run.

This creates: `profiles`, `submissions`, the `screenshots` storage bucket, and RLS
policies for the two roles.

### 3. Create the two accounts
Dashboard → **Authentication → Users → Add user** → repeat twice:
- Ashleigh: any email + a password you'll share with her
- Sungmin (you): your email + a password

For each user, copy the UUID shown in the users list. Then back in the SQL editor:

```sql
insert into public.profiles (id, display_name, role, avatar_emoji)
values
  ('<ASHLEIGH_UUID>',  'Ashleigh',  'student', '🐱'),
  ('<SUNGMIN_UUID>', 'Sungmin', 'checker', '🐶');
```

### 4. Wire env vars
Dashboard → **Project settings → API** → copy *Project URL* and *anon public* key.

```bash
cp .env.example .env
# then edit .env and paste both values
```

### 5. Run it
```bash
npm install
npm run dev          # http://localhost:5173
```

## Deploying for real

Easiest: **Vercel** or **Netlify** with these two env vars set in their dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

```bash
npm run build        # produces dist/
```

## Project layout

```
src/
├── App.tsx                     # auth gate → Login or Dashboard
├── lib/
│   ├── supabase.ts             # Supabase client
│   └── week.ts                 # Monday-start helpers + streak calc
├── hooks/
│   ├── useAuth.ts              # session + profile load
│   └── useSubmissions.ts       # realtime submissions list
├── components/
│   ├── Login.tsx               # email/password sign-in
│   ├── Dashboard.tsx           # progress bar, streak, stamp wall, quest log
│   ├── SubmitForm.tsx          # Ashleigh submits a new quest
│   ├── QuestCard.tsx           # one submission, with checker controls
│   └── ScreenshotImage.tsx     # signed-URL <img>
├── types.ts                    # shared types + WEEKLY_GOAL constant
└── index.css                   # Tailwind + pixel-game theme
supabase/
└── schema.sql                  # tables, RLS, storage bucket
```

## Tweak knobs

- **Weekly goal** (default 2 videos): `WEEKLY_GOAL` in `src/types.ts`
- **Stamp choices**: `STAMPS` in `src/types.ts`
- **Theme colors**: `tailwind.config.js` → `colors.quest`
# ashleigh-korean-quest
