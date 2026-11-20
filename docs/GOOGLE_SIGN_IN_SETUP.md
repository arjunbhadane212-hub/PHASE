# Google Sign-In — why it fails today and how to turn it on

**Status:** The app code is correct. Google sign-in fails because the **Google
provider is disabled in Supabase** (`external.google = false` on the project
`dnfcrpthpinilibvqwtf`). `signInWithGoogle()` in `src/contexts/AuthContext.js`
pre-checks this and surfaces the message *"Google sign-in is being set up…"* —
that message is the symptom, not a bug.

Nothing in the frontend needs to change for the **web** flow. Do the config
below and the existing button starts working.

---

## 1. Google Cloud Console — create an OAuth client

1. https://console.cloud.google.com → pick (or create) a project.
2. **APIs & Services → OAuth consent screen**: configure it (External),
   app name "Phase", support email, and add the scopes `email`, `profile`,
   `openid`. Add yourself as a test user while it's unverified.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID →
   Web application.**
4. **Authorized JavaScript origins** — add every origin the app is served from:
   - `http://localhost:3000`
   - your production domain, e.g. `https://app.phase...` (the real Vercel/prod URL)
5. **Authorized redirect URIs** — add Supabase's callback (this exact value):
   - `https://dnfcrpthpinilibvqwtf.supabase.co/auth/v1/callback`
6. Save. Copy the **Client ID** and **Client secret**.

## 2. Supabase — enable the provider

Dashboard → **Authentication → Providers → Google**:
- Toggle **Enabled** on.
- Paste the **Client ID** and **Client secret** from step 1.
- Save.

## 3. Supabase — allow the app's redirect URLs

Dashboard → **Authentication → URL Configuration**:
- **Site URL**: your production origin (e.g. `https://app.phase...`).
- **Redirect URLs** — add (wildcards keep both the OAuth and the password-reset
  redirects working):
  - `http://localhost:3000/**`
  - `https://<your-prod-domain>/**`

The app sends users back to `${origin}/dashboard` after Google (see
`signInWithGoogle`), and to `${origin}/reset-password` for password resets, so
both must be inside the allow-list above.

## 4. Verify

- Web: load `/login`, click **Continue with Google**. You should bounce to
  Google, then back to `/dashboard` (new users route on to `/onboarding`).
- Quick re-check that the provider is live (should print `"google": true`):
  ```bash
  curl -s "https://dnfcrpthpinilibvqwtf.supabase.co/auth/v1/settings" \
    -H "apikey: <REACT_APP_SUPABASE_ANON_KEY>" | python3 -m json.tool | grep google
  ```

---

## ⚠️ Capacitor / Android caveat

The web redirect flow (`supabase.auth.signInWithOAuth` with
`redirectTo: window.location.origin + '/dashboard'`) completes cleanly in a
**browser**. Inside the installed **Android (Capacitor) WebView** the origin is
not an `https://` web origin, so the redirect back into the app needs extra
wiring — a deep link / custom URL scheme handled by `@capacitor/app`'s
`appUrlOpen`, opening Google in the system browser via `@capacitor/browser`, or
a native Google Sign-In plugin.

So: once steps 1–3 are done, Google works on the **web build immediately**. The
**Android build** needs that deep-link handling added before the Google button
works there. Email/password already works in both.
