// Create or update an admin user with a password, with no confirmation email
// (bypasses the email rate limit). Useful for first sign-in and for a hired
// maintainer. Uses the service-role/secret key via the GoTrue admin API.
//
//   node --env-file=.env.local scripts/set-admin-password.mjs <password> [email]
//
// Email defaults to the first entry in ADMIN_EMAILS. Choose a strong password;
// it is passed on the command line, so clear your shell history afterwards if
// that matters to you. Then sign in at /admin with email + password.
import process from "node:process";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.argv[2];
const email =
  process.argv[3] ||
  (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim().toLowerCase();

if (!URL || !KEY) {
  console.error("Missing Supabase env. Run with --env-file=.env.local.");
  process.exit(1);
}
if (!password || !email) {
  console.error(
    "Usage: node --env-file=.env.local scripts/set-admin-password.mjs <password> [email]",
  );
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function findUser() {
  const res = await fetch(
    `${URL}/auth/v1/admin/users?per_page=200`,
    { headers },
  );
  if (!res.ok) throw new Error(`list users: ${res.status} ${await res.text()}`);
  const body = await res.json();
  const users = Array.isArray(body) ? body : body.users ?? [];
  return users.find((u) => (u.email ?? "").toLowerCase() === email) ?? null;
}

const existing = await findUser();

let res;
if (existing) {
  res = await fetch(`${URL}/auth/v1/admin/users/${existing.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password, email_confirm: true }),
  });
} else {
  res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
}

if (!res.ok) {
  console.error(`Failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
console.log(
  `${existing ? "Updated" : "Created"} ${email}. Sign in at /admin with email + password.`,
);
