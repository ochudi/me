# Admin / CMS setup

The site reads content from Supabase and falls back to the MDX files in
`src/content` when Supabase is not configured, so it always runs. To turn on
the live `/admin` CMS, do this once.

## 1. Rotate and add your keys

The keys shared earlier are compromised — rotate them first in
**Supabase dashboard → Settings → API**. Then put the new values in
`.env.local` (gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # publishable / anon, safe in browser
SUPABASE_SERVICE_ROLE_KEY=...            # secret, used only by the seed script
ADMIN_EMAILS=ofoma.chudi@gmail.com       # comma-separated allowlist
```

Never give the service-role key a `NEXT_PUBLIC_` prefix, and never commit it.

## 2. Create the schema

In **Supabase dashboard → SQL editor**, paste and run the contents of
`supabase/migrations/0001_init.sql`. It is idempotent (safe to re-run) and
creates the `ochudi_*` tables, row-level security policies, the
`ochudi-media` storage bucket, and the `ochudi_admins` allowlist table.

## 3. Seed your existing content

```
node --env-file=.env.local scripts/seed.mjs
```

This copies the MDX files into the database and registers your `ADMIN_EMAILS`
in `ochudi_admins` (which is what RLS checks for write access).

## 4. Configure auth redirect

In **Supabase dashboard → Authentication → URL Configuration**, add your site
URL(s) to the allowed redirect list, e.g. `http://localhost:3000/**` and
`https://ochudi.com/**`. Magic-link emails redirect to `/auth/callback`.

## 5. Sign in

Run the app, go to `/admin`, enter your email, and click the link Supabase
sends you. You are in.

## Day-to-day

- `/admin` — dashboard with each section.
- Create/edit entries; toggle **Published** to show on the live site.
- Cover images upload to Supabase Storage; the work pages render them.
- To let someone else maintain the site: add their email to `ADMIN_EMAILS`
  (env) **and** insert it into `ochudi_admins` (one row). That is the whole
  grant.

## Sign-in methods

`/admin/login` offers several; all are gated by `ADMIN_EMAILS` + `ochudi_admins`.

- **Email + password (instant, no setup, no email).** Set a password without a
  confirmation email:

  ```
  npm run admin:password -- "your-strong-password"
  ```

  Then sign in with your email + that password. Best when the built-in email
  rate limit is in the way.

- **Google.** In Google Cloud Console create an OAuth 2.0 Web client with
  redirect URI `https://<your-ref>.supabase.co/auth/v1/callback`. Paste the
  client id/secret into Supabase → Authentication → Providers → Google. No
  emails, no rate limit. Recommended.

- **Apple.** Same idea but needs a paid Apple Developer account, a Service ID
  and a key. Optional; the button is live once you enable the provider.

- **Magic link.** Works, but the built-in email service is rate-limited
  (a few per hour). Add custom SMTP in Supabase to lift that, or use one of
  the above.

Note: whichever method, the signed-in email must be in `ADMIN_EMAILS` and
`ochudi_admins`. If you use Apple's "Hide My Email", add that relay address to
the allowlist or share your real email.

## How content fields map

`src/lib/admin/fields.ts` is the single source of truth for the admin forms.
Add or change a field there and both the form and the save action pick it up.
