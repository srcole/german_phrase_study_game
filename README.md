# Wortreise

A small German study app built with React, Vite, JavaScript, plain CSS, and the Supabase JavaScript client. Practice 10 random words from 42 elementary entries, type English translations, review examples, and override automatic grading. Completed quizzes sync across devices through Supabase Auth and PostgreSQL. History shows individual answers; Progress includes overall statistics and vocabulary sorted by lowest accuracy.

No custom backend, Vercel functions, database views, stored procedures, or paid services are required. Navigation uses `#quiz`, `#history`, `#progress`, and `#account`: fragments stay in the browser, so refreshes work on Vercel without rewrites.

## Local development

Install Node.js 22.12 or later (Node 24 LTS also works), then:

```sh
npm install
cp .env.example .env
```

Fill in `.env` using your Supabase project:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

```sh
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). Restart Vite after changing environment variables. Missing/invalid configuration displays a setup message instead of crashing. `.env` and other local environment files are ignored; `.env.example` contains placeholders only.

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies and update the lockfile |
| `npm ci` | Install the exact locked dependencies |
| `npm run dev` | Start Vite locally |
| `npm test` | Run core logic tests using Node's built-in test runner |
| `npm run build` | Generate the static production app in `dist/` |
| `npm run preview` | Serve the built app locally |

## Create and configure Supabase

1. Sign in at https://supabase.com and create an organization/project on the **Free** plan. Choose a region and a strong database password; the app never needs that password. Wait for provisioning.
2. Use the project's **Connect** dialog to copy the project URL. In **Settings → API Keys**, copy the **publishable** key (`sb_publishable_…`). A legacy `anon` key also works. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).
3. Put these two values into the local `.env` variables above. Never use a secret key (`sb_secret_…`), `service_role` key, or database password in a `VITE_` variable. Vite embeds these variables in the public JavaScript bundle.
4. Open **SQL Editor → New query** in the Supabase project. Copy the entire contents of `supabase/migrations/001_quiz_history.sql`, paste it into the editor, and press **Run**. Run it once on a fresh project. It is transactional; a failed run rolls back. It deliberately does not silently replace existing tables or policies.
5. Check **Table Editor** for `quiz_sessions` and `quiz_answers`. Confirm RLS is enabled on both. Keep the `public` schema available through the Data API (the project default).
6. In **Authentication → Sign In / Providers → Email**, enable email/password signups. Configure a minimum password length of at least 8. Disable anonymous sign-ins; they are not used.
7. For the simplest setup requiring only Supabase Free, turn **Confirm email** off. Users can then register and log in immediately, but email ownership is **not verified**. The app also supports confirmation-on signup if you have email delivery configured.
8. Supabase's built-in mail service restricts recipients to organization members and is rate limited; do not assume it will deliver signup emails to arbitrary users. If you want verified email signups, configure an SMTP provider within its free allowance and enable confirmation; this is optional, not an app dependency. See [SMTP limitations](https://supabase.com/docs/guides/auth/auth-smtp) and [email confirmation settings](https://supabase.com/docs/guides/auth/general-configuration).
9. Under **Authentication → URL Configuration**, initially set **Site URL** to `http://localhost:5173`. Add `http://localhost:5173` to **Redirect URLs**. After deploying, set Site URL to the production `https://YOUR_APP.vercel.app` origin and add that exact origin to Redirect URLs too. Add any specific preview origin you want to use for confirmation. See [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).
10. Create a test account through the app, confirm its email if enabled, log in, complete a quiz, refresh, and check History and Progress. Log in with the same account in another browser to verify persistence. Test logout and incorrect-password errors too.

Sessions persist through the Supabase client and refresh automatically. Logout clears this browser's session. Password handling belongs entirely to Supabase Auth. Password reset and account deletion UIs are outside this version's scope.

## Database and security

`supabase/migrations/001_quiz_history.sql` creates both tables, constraints, indexes, and separate SELECT/INSERT policies. It revokes all table privileges from PUBLIC, anon, and authenticated, then grants authenticated only SELECT and INSERT. There are no UPDATE or DELETE grants/policies. User IDs must match `auth.uid()`; the answer policy and composite foreign key also require ownership of the referenced session. Authorization is enforced by PostgreSQL, even when requests bypass the UI. See [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Vocabulary stays in `src/data/vocabulary.js`; preserve IDs when editing it. Historical expected answers use the current local vocabulary. Browser-supplied scores and manual grades are self-reported study data, not trusted competition results.

Saving uses two requests: session insert followed by one bulk answer insert. Without a database function/server transaction these cannot be atomic. Stable UUIDs, unique constraints, and reads before retries prevent duplicate records on retry. If the second request fails, stay on the results page and use **Retry saving**. History flags missing answers; Progress counts saved answers and separately averages session scores. An abandoned partial save can remain in history. No update/delete permission is added to hide that limitation.

An active quiz survives tab navigation but is held in memory until saved; refreshing or logging out discards it. The app warns on refresh/close while work is unsaved. Avoid changing quiz history concurrently while a large paginated history fetch is in progress. These simple frontend statistics fetch all your rows in 500-row pages; they are intended for hobby-sized histories.

### Test security with two accounts

Use a normal browser profile for User A and a private window for User B. Complete one quiz with each. Copy their user UUIDs and B's session UUID from the Supabase Table Editor. Do **not** test access isolation using SQL Editor's default postgres role: it bypasses RLS.

While A is logged in to the local Vite development app, open the browser developer console and run:

```js
const { supabase: db } = await import('/src/lib/supabase.js');
const { data: { user: a } } = await db.auth.getUser();
const bId = 'PASTE_USER_B_UUID';
const bSessionId = 'PASTE_USER_B_SESSION_UUID';
await db.from('quiz_sessions').select('*'); // Only A's sessions
await db.from('quiz_answers').select('*'); // Only A's answers
await db.from('quiz_sessions').select('*').eq('user_id', bId); // []
await db.from('quiz_answers').select('*').eq('user_id', bId); // []
const now = new Date().toISOString();
await db.from('quiz_sessions').insert({
  user_id: bId, started_at: now, completed_at: now,
  correct_count: 0, total_count: 10, duration_seconds: 0
}); // Must fail with RLS/permission error
await db.from('quiz_answers').insert({
  session_id: bSessionId, user_id: bId,
  vocabulary_id: 'hallo', user_answer: 'hello', correct: true
}); // Must fail
await db.from('quiz_answers').insert({
  session_id: bSessionId, user_id: a.id,
  vocabulary_id: 'hallo', user_answer: 'hello', correct: true
}); // Must also fail: A cannot attach an answer to B's session
await db.from('quiz_sessions').update({ correct_count: 10 }).eq('user_id', a.id);
await db.from('quiz_answers').delete().eq('user_id', a.id);
// Both must fail with permission denied, even for A's own data.
```

Repeat with A and B reversed. Then log out and run SELECT and INSERT requests on both tables again: they must fail with permission errors. Normal quiz completion while signed in verifies permitted own-user inserts. Inspect each returned `error` and `data`; a denied SELECT by RLS returns an empty array, whereas revoked table privileges yield an error. The dev-only module import above is unavailable in the built production app.

## Deploy on Vercel Hobby

1. Create a GitHub repository and push this project, including `package-lock.json`. Keep `.env` out of git. No GitHub repository is created automatically by this project.
2. Sign in to Vercel, choose **Add New → Project**, connect GitHub, and import the repository under your Hobby account.
3. Select the **Vite** framework preset and repository root. Use install command `npm ci`, build command `npm run build`, output directory `dist`, and Node.js 22.x or 24.x. No server functions are needed. See [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the project's **Environment Variables** for Production (and Preview/Development if used). Use the same URL and publishable key as local development.
5. Deploy. Add the resulting origin to Supabase's auth settings as described above. Verify signup/login, quiz saving, History, Progress, logout, and refreshing `/#history`.
6. Subsequent pushes to the production branch trigger production deployments; other branches/PRs can create previews through Vercel's Git integration. Environment variable changes require a new deployment because Vite reads them at build time. SQL changes are applied separately in Supabase, not by Vercel.

## Verification and scope

Automated tests cover normalization, rejection of wrong answers, random unique selection, final manual grades, empty states in calculations, and progress aggregation. Matching ignores case, repeated whitespace, and common punctuation; it deliberately does not guess synonyms or spelling. Use manual grading for valid alternate translations.

The production build can run without credentials and shows setup guidance. Live authentication, SQL execution/RLS, cross-device persistence, and deployment require your Supabase/Vercel accounts and must be smoke-tested after configuration. Responsive CSS, semantic forms, visible focus styles, live feedback, and labeled controls support desktop, mobile, and keyboard use.

Latest local verification: `npm install` completed with 0 reported vulnerabilities; `npm test` passed all 6 tests; `npm run build` completed successfully. Node 22.23.2 was downloaded to a temporary directory for these checks because Node/npm were not on this machine's PATH. Install Node normally for ongoing development. Live Supabase and browser interaction tests have not been run against a configured project.
