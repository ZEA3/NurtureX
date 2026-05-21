# Deploying NurtureX

A complete walkthrough: get your project onto GitHub, then deploy live with Vercel. ~15 minutes start to finish.

---

## Before you start — security check

Decode your `VITE_SUPABASE_ANON_KEY` at https://jwt.io. The payload must contain:

```json
{ "role": "anon" }
```

If it says `"role": "service_role"` instead, **stop**. That key bypasses Row Level Security. Get the correct **anon** / **public** key from Supabase → Settings → API and replace it in `.env`.

This is the most common security mistake people make with Supabase. The anon key is safe to ship in the browser bundle. The service_role key is **never** safe in any browser-visible code.

✅ Good? Continue.

---

## Step 1 — Get the project on GitHub

In VS Code, open a terminal in your project folder.

```bash
# Confirm .env is gitignored before doing anything (it should be):
git check-ignore .env
# Should print: .env  (meaning yes, it's ignored)

# Initialize git if needed:
git init
git add .
git commit -m "initial commit"
```

Then on **github.com**:
1. Click **+** → **New repository**
2. Name it (e.g. `nurturex`)
3. **Don't** add a README / .gitignore / license — your local repo already has them
4. Create

Back in VS Code's terminal:
```bash
git remote add origin https://github.com/<your-username>/nurturex.git
git branch -M main
git push -u origin main
```

> **VS Code shortcut:** instead of the terminal, you can use the Source Control panel (Ctrl+Shift+G). Click **Publish to GitHub** and pick whether the repo is public or private. Same result.

Verify on github.com that **`.env` is NOT in the file list**. If it is, stop and remove it:
```bash
git rm --cached .env
git commit -m "remove .env from tracking"
git push
```

---

## Step 2 — Deploy on Vercel

1. Go to https://vercel.com and sign in **with GitHub**
2. Click **Add New** → **Project**
3. Find your `nurturex` repo in the list → **Import**

Vercel will auto-detect:
- Framework: **Vite** ✓
- Build command: `npm run build` ✓
- Output directory: `dist` ✓

(All of this is also pinned in `vercel.json` so you can ignore the auto-detection.)

**Before clicking Deploy**, expand **Environment Variables** and add two:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase URL (e.g. `https://abcdefgh.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your anon / public key |

Set both for **Production**, **Preview**, and **Development** environments (the default checkbox state).

Click **Deploy**. ~60–90 seconds.

When it's done you get a live URL like `https://nurturex-abc123.vercel.app/`. Open it.

---

## Step 3 — Add the live URL to Supabase auth

Supabase blocks auth callbacks from URLs it doesn't know about.

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL**: `https://nurturex-abc123.vercel.app` (your actual Vercel URL)
3. **Redirect URLs**: add `https://nurturex-abc123.vercel.app/**` (the `**` is a wildcard for any path)
4. Save

Without this, sign-in might still work for password auth (it doesn't need redirects), but anything involving email magic-links or password resets will fail.

---

## Step 4 — Bootstrap your first admin

The deployed site has no users yet. Same workflow as local:

1. Supabase Dashboard → **Authentication** → **Users** → **Add user** → enter your email + password
2. **SQL Editor**:
   ```sql
   update public.profiles
     set role = 'admin', status = 'active'
     where email = 'you@example.com';
   ```

Now sign in on your live Vercel URL. You're admin. Add doctors from **Admin → Doctors → Add doctor**.

---

## How updates work

Every push to `main` automatically redeploys. To ship a change:

```bash
git add .
git commit -m "describe what changed"
git push
```

Vercel builds and deploys automatically. ~60 seconds. Pull requests get their own preview URL automatically too — handy for testing before merging.

---

## Routing — why this works

The app uses **`BrowserRouter`** (clean URLs like `/admin/doctors`), and `vercel.json` contains a rewrite rule:

```json
"rewrites": [
  { "source": "/((?!assets/|favicon\\.png|logo\\.png|robots\\.txt).*)", "destination": "/index.html" }
]
```

This tells Vercel: any URL that's not a real file (assets, favicon, logo, robots) should serve `index.html`, letting React Router handle the path. So `https://yoursite.vercel.app/admin/patients` works on a hard refresh — Vercel serves `index.html`, the bundle boots, React Router sees the URL and renders the right page.

Without this rewrite, refreshing on `/admin/patients` would give a 404 because no such file exists. **Don't delete `vercel.json`.**

---

## Custom domain

Vercel project → **Settings** → **Domains** → enter your domain. Add the DNS records Vercel shows you. SSL is automatic. Once propagated, update Supabase's Site URL + Redirect URLs to match.

---

## Local development

Same as before — Vercel changes nothing about your local workflow:

```bash
npm install
cp .env.example .env       # if you don't already have it
npm run dev                # → http://localhost:5173
```

To preview the production build locally:
```bash
npm run build && npm run preview     # → http://localhost:4173
```

---

## Troubleshooting

### "I see a blank white page"
Open DevTools → Console.
- `Missing VITE_SUPABASE_URL` or similar → env vars weren't added in Vercel. Project Settings → Environment Variables. After adding, **redeploy** (Vercel doesn't auto-rebuild when env vars change).
- 404s on `.js` / `.css` files → cached bad build. Hard-refresh with Ctrl+Shift+R.

### "Sign in works but I get bounced to /auth"
Your account doesn't have a `profiles` row, or the role isn't `admin` or `doctor`. Check:
```sql
select id, email, role, status from public.profiles where email = 'you@example.com';
```
If `role` is null or wrong, fix it:
```sql
update profiles set role='admin' where email='you@example.com';
```

### "Refresh on /admin returns 404"
You're missing the `vercel.json` SPA rewrite. Make sure that file exists at the project root and was committed.

### "Sign in fails with 'Invalid login credentials'"
Check that the Vercel env vars match your `.env`. Common mistake: copying `VITE_SUPABASE_URL` from one project but `VITE_SUPABASE_ANON_KEY` from another.

### "Cookies/session don't persist"
The site uses `localStorage`, not cookies — should work everywhere. If you're in an incognito window with strict tracking protection, try a normal window.

### "Build fails on Vercel but works locally"
- Check the Vercel build log for the actual error (don't guess).
- Most common cause: a `.env` value referenced in code that exists locally but isn't set in Vercel.
- Second most common: `node_modules` accidentally committed to git, which is now stale on Vercel. Confirm `node_modules` is in `.gitignore` and not tracked: `git ls-files | grep node_modules` should be empty.

---

## File checklist (what's in the repo for deployment)

```
✅ vite.config.js                — clean Vite config (no base-path tricks)
✅ vercel.json                   — SPA rewrite + asset caching
✅ src/App.jsx                   — BrowserRouter for clean URLs
✅ index.html                    — favicon at /favicon.png
✅ package.json                  — minimal scripts (dev / build / preview)
✅ .gitignore                    — excludes .env, node_modules, dist, .vercel
✅ .env.example                  — template (committed); .env is local-only
```

That's the entire deploy surface. Vercel reads `vercel.json` and `package.json` and does the rest.
