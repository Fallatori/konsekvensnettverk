# Setting up this project — step-by-step guide

This guide assumes you're starting from a completely empty computer (or at
least one that's never run this project before). Follow the steps in order —
don't skip ahead. Each step ends with a way to check it actually worked
before moving on. Total time: about 20–30 minutes.

Every command below goes into a **terminal**:
- **macOS**: open the `Terminal` app (search for it with Spotlight, ⌘+Space).
- **Windows**: open `PowerShell` (search for it in the Start menu).
- **Linux**: whatever terminal your desktop environment provides.

Type or paste each command and press Enter. One command at a time.

---

## Step 1 — Install Node.js

Node.js is the program that runs this app.

1. Go to **https://nodejs.org** and download the **LTS** version (not
   "Current"). Run the installer, clicking through with default options.
2. Close and reopen your terminal (important — otherwise it won't see the
   new install), then check it worked:
   ```bash
   node -v
   npm -v
   ```
   ✅ You should see version numbers, e.g. `v20.20.2` and `10.8.2`. Any
   `v20.x` or newer works. If instead you see something like `command not
   found`, the install didn't complete — try again, or restart your computer.

## Step 2 — Install Git

Git is what downloads ("clones") the project's code to your computer.

1. **macOS**: open a terminal and type `git -v`. If it's not installed,
   macOS will offer to install it for you — accept.
2. **Windows**: download and install from **https://git-scm.com** (default
   options are fine).
3. **Linux**: `sudo apt install git` (Debian/Ubuntu) or the equivalent for
   your distro.
4. Verify:
   ```bash
   git --version
   ```
   ✅ You should see something like `git version 2.x.x`.

*(If you're not cloning from a Git remote — e.g. you were handed the project
folder directly on a USB drive — skip to Step 5.)*

## Step 3 — Install Docker Desktop (for the database)

This project needs a PostgreSQL database. The easiest way to get one running
without fiddling with database setup commands is Docker.

1. Download Docker Desktop from **https://www.docker.com/products/docker-desktop**
   and install it.
2. **Open the Docker Desktop application** and leave it running in the
   background (look for the whale icon in your menu bar/system tray — it
   needs to stay running whenever you use this project's database).
3. Verify in your terminal:
   ```bash
   docker --version
   ```
   ✅ You should see something like `Docker version 27.x.x`.

*(Prefer to install PostgreSQL directly instead of using Docker? See
"Alternative: native PostgreSQL install" near the bottom of this guide. It
works, but has more steps — Docker is the easy path.)*

## Step 4 — Start the database

With Docker Desktop open and running, paste this whole block into your
terminal:

```bash
docker run --name bubbles-db \
  -e POSTGRES_USER=bubbles \
  -e POSTGRES_PASSWORD=bubbles \
  -e POSTGRES_DB=bubbles \
  -p 5432:5432 \
  -d postgres:16
```

✅ It should print a long string of random letters/numbers (a container ID)
and return you to the prompt. Verify it's actually running:

```bash
docker ps
```

You should see a row with `bubbles-db` and `postgres:16` in it. If you don't,
run `docker logs bubbles-db` to see what went wrong (a common cause: another
program is already using port 5432 — see Troubleshooting below).

> This database keeps running in the background even after you close your
> terminal. To stop it later: `docker stop bubbles-db`. To start it again:
> `docker start bubbles-db` (you only need `docker run` once, ever — it
> creates the container the first time).

## Step 5 — Get the project's code

If you were given a Git URL (something ending in `.git`, from GitHub/GitLab
etc.):

```bash
git clone <the-repo-url> bubbles
cd bubbles
```

If instead you already have the project folder (copied via USB drive, zip
file, etc.), just open a terminal **inside that folder**. On macOS/Windows
you can usually right-click the folder and choose "Open in Terminal" (or
navigate there with `cd path/to/bubbles`).

✅ Check you're in the right place:
```bash
ls
```
You should see files like `package.json`, `prisma`, `src` in the list.

## Step 6 — Install the project's dependencies

```bash
npm install
```

This downloads everything the project needs into a `node_modules` folder.
It can take a minute or two and will print a lot of text — that's normal.

✅ It worked if you're returned to the prompt without red "error" text at the
end (some yellow "warning" text is fine and normal).

## Step 7 — Create your configuration file

This project reads its settings (like the database connection) from a file
called `.env`, which is never shared or committed to Git (everyone creates
their own).

1. Copy the template:
   - macOS/Linux: `cp .env.example .env`
   - Windows (PowerShell): `copy .env.example .env`
2. Generate a random secret value (needed for login security) by running:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   This prints a random string like `k3f9s...==`. Copy it (select the text,
   copy it — you'll paste it in the next step).
3. Open the new `.env` file in any text editor (VS Code, Notepad, TextEdit —
   whatever you have) and fill it in like this:
   ```bash
   DATABASE_URL="postgresql://bubbles:bubbles@localhost:5432/bubbles"
   AUTH_SECRET="<paste the random string from step 2 here>"
   SEED_USER_EMAIL="admin@example.com"
   SEED_USER_PASSWORD="endre-meg-nå"
   ```
   The `DATABASE_URL` above matches exactly what Step 4's Docker command
   created — don't change it unless you changed that command.
4. Save the file.

✅ Check the file exists and has your values:
```bash
cat .env
```
(On Windows: `type .env`)

## Step 8 — Set up the database tables and demo data

These three commands, in order:

```bash
npx prisma generate
```
✅ Should end with a green checkmark and `Generated Prisma Client`.

```bash
npx prisma migrate deploy
```
✅ Should end with either a list of applied migrations, or `No pending
migrations to apply` (that's also fine — it means it's already up to date).

```bash
npm run db:seed
```
✅ Should print something like:
```
Seeded team "Standardteam", user "admin@example.com", scenario "Scenario 1".
Dev login: admin@example.com / endre-meg-nå
```
That second line is your actual login for Step 9 — handy if you changed
`SEED_USER_EMAIL`/`SEED_USER_PASSWORD` and forgot what you set.

If any of these three fail with a database connection error, go back and
check Step 4 (is Docker Desktop open? does `docker ps` show `bubbles-db`
running?) and Step 7 (does `.env`'s `DATABASE_URL` match?).

## Step 9 — Run the app

```bash
npm run dev
```

✅ Wait for a line like `- Local: http://localhost:3000`. Leave this
terminal window open and running — closing it stops the app.

Open your web browser and go to **http://localhost:3000**. You should land
on a login page. Log in with:
- Email: `admin@example.com` (or whatever you set as `SEED_USER_EMAIL`)
- Password: `endre-meg-nå` (or whatever you set as `SEED_USER_PASSWORD`)

You should now see the scenario dashboard. 🎉

**To stop the app:** click into that terminal window and press `Ctrl+C`.

---

## Troubleshooting

| Problem | Likely cause / fix |
|---|---|
| `command not found: node` / `npm` | Node.js isn't installed, or you didn't reopen your terminal after installing it (Step 1). |
| `command not found: docker` | Docker Desktop isn't installed, or isn't open. Open the Docker Desktop app first. |
| `docker: Error ... port is already allocated` | Something else is already using port 5432 (maybe a previously-installed Postgres). Either stop that other program, or change the `-p 5432:5432` in Step 4 to e.g. `-p 5433:5432` **and** update `DATABASE_URL` in `.env` to end in `:5433/bubbles` instead. |
| `Can't reach database server at localhost:5432` | Docker Desktop isn't running, or the container isn't started. Run `docker ps` — if `bubbles-db` isn't listed, run `docker start bubbles-db`. |
| `Environment variable not found: DATABASE_URL` | You're running commands from the wrong folder (no `.env` there), or you skipped Step 7, or forgot to save the file. |
| `AUTH_SECRET` errors on login | `.env`'s `AUTH_SECRET` is empty or missing — redo Step 7.2–7.3. |
| Prisma-related import errors when running `npm run dev` | You skipped `npx prisma generate` (Step 8) — run it, then restart `npm run dev`. |
| `Port 3000 is already in use` | Another `npm run dev` is already running somewhere (maybe from a previous terminal you forgot about). Find and close it, or stop it with `Ctrl+C` in that window. |
| Login page says "Fant ingen scenarioer" (found no scenarios) | The seed step (Step 8, `npm run db:seed`) didn't run or failed — re-run it. |

If you're stuck on something not listed here, copy the exact error message
you're seeing — that's the fastest way to get help.

---

## Optional: run the automated checks

Not required to use the app, but useful if you're going to change code:

```bash
npm run typecheck    # checks the TypeScript code for type errors
npm run lint          # checks code style
npm run test          # runs automated tests (no database needed)
```

End-to-end tests additionally need Playwright's browser installed once:
```bash
npx playwright install chromium
npm run test:e2e
```

---

## Alternative: native PostgreSQL install (instead of Docker)

Only do this if you specifically don't want to use Docker. It has more
manual steps.

- **macOS**: `brew install postgresql@16 && brew services start postgresql@16`
- **Windows/Linux**: download from **https://www.postgresql.org/download/**,
  or use your Linux distro's package manager (e.g. `sudo apt install postgresql`).

Then open PostgreSQL's command-line client (`psql`) and run:
```sql
CREATE USER bubbles WITH PASSWORD 'bubbles';
CREATE DATABASE bubbles OWNER bubbles;
```

You'll end up with the same connection string as the Docker path:
`postgresql://bubbles:bubbles@localhost:5432/bubbles`. Continue from Step 5
above.

---

## Notes for later

- The seed script (`prisma/seed.ts`) is idempotent — safe to re-run any time
  (`npm run db:seed`) to reset the demo scenario back to its starting state.
- The Prisma client is generated into `src/generated/prisma`, which is
  gitignored — always re-run `npx prisma generate` after a fresh clone or
  after pulling schema changes.
- This app has no OS-specific requirements — Windows, macOS, and Linux all
  work the same way (on Windows, using WSL for the terminal gives smoother
  Next.js dev-server performance, but isn't required).
