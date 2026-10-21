# Leave Request

A simple full-stack project I built to study React, Node.js, PostgreSQL, and session-based authentication. Members can submit leave requests and view their own records. Managers can review requests, change their statuses, and soft-delete member accounts. I also practised deploying the application to a Linux server.

## Features

- Register a member account and log in through one combined form.
- Submit leave dates and a reason, then view personal requests and statuses.
- Let managers view all requests with applicant usernames.
- Change requests between pending, approved, and rejected, including revising an earlier decision.
- List active and deleted members, and soft-delete an active member by ID.
- Preserve deleted members' requests while blocking login, protected access, and further status changes for those applicants.
- Restore the signed-in view after a page refresh and log out by destroying the session.
- Show loading, empty, busy, and error states; refresh lists after successful changes.
- Display dates in Hong Kong time and order request/member lists by ascending ID.

## Tech stack

| Layer | Technology | Location |
| --- | --- | --- |
| Frontend | React and Vite | `frontend/` |
| Backend | Node.js, Express, and node-postgres (`pg`) | `backend/` |
| Authentication | bcryptjs, express-session, and connect-pg-simple | `backend/src/server.js` and `backend/src/seed.js` |
| Database | PostgreSQL | Application schema in `database/schema.sql`; session table managed by connect-pg-simple |
| Linux hosting | PM2 and Nginx | PM2 runs the backend; Nginx serves the frontend and proxies API requests |

The browser sends `/api/...` requests through a proxy. Express validates input, checks the current account and permissions, queries PostgreSQL, and returns JSON. Database credentials, seed passwords, and the session secret stay in the backend environment file.

- **Local development:** Vite serves React and forwards `/api/...` to Express.
- **Linux deployment:** Nginx serves the built React files and forwards `/api/...` to Express on `127.0.0.1:3000`. PM2 keeps Express running in the background.

All HTTP routes and middleware are in `backend/src/server.js`. `db.js` exports the shared connection pool, and `seed.js` creates the initial accounts. `App.jsx` owns account/message/busy state; `Member.jsx` and `Manager.jsx` contain their respective forms and tables.

## Run locally on Windows

These commands use PowerShell. Install [Git](https://git-scm.com/downloads), [Node.js](https://nodejs.org/en/download) with npm, and [PostgreSQL](https://www.postgresql.org/download/windows/) first. Node.js 24 was used for this project; use a supported Node.js 24 LTS release.

### 1. Clone the project

Run this in the folder where you want to keep the project:

```powershell
git clone https://github.com/kwanyinsan/leave-request.git
cd leave-request
```

The following setup commands start from the repository root.

If PostgreSQL commands are not on your PATH, add its `bin` folder for this PowerShell session. Adjust `18` to your installed PostgreSQL version:

```powershell
$env:Path = "C:\Program Files\PostgreSQL\18\bin;$env:Path"
```

### 2. Create the database

Make sure the PostgreSQL service is running. Connect using the administrator password chosen during installation:

```powershell
psql -h localhost -p 5432 -U postgres -d postgres -W
```

At the `psql` prompt, run:

```sql
CREATE ROLE leave_request_app WITH LOGIN;
\password leave_request_app
CREATE DATABASE leave_request OWNER leave_request_app;
\q
```

`\password` prompts for the application role's password. Keep it for the backend environment file.

Back in PowerShell, create the application tables as their owner:

```powershell
psql -h localhost -p 5432 -U leave_request_app -d leave_request -W -v ON_ERROR_STOP=1 -1 -f database/schema.sql
```

This creates empty `users` and `leave_requests` tables. `ON_ERROR_STOP=1` stops on an SQL error; `-1` executes the schema in one transaction. Run this setup once for a new database, not every time you start the app.

The `session` table is separate from this schema file. `connect-pg-simple` creates it when needed because the backend enables `createTableIfMissing: true`. It stores session identifiers, JSON session data, and expiry times.

### 3. Install dependencies and configure the backend

```powershell
cd backend
npm.cmd ci
notepad .env
```

Create `backend/.env` if it does not exist. If it already exists, edit it without overwriting private settings. Set these values, replacing every password/secret placeholder:

```dotenv
PORT=3000
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=leave_request
PGUSER=leave_request_app
PGPASSWORD="replace_with_your_app_password"
SESSION_SECRET="replace_with_a_generated_random_secret"
SEED_MEMBER_PASSWORD="replace_with_a_private_member_password"
SEED_MANAGER_PASSWORD="replace_with_a_private_manager_password"
```

Generate a session secret locally with Node.js, then copy its output into `SESSION_SECRET`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep the generated value private. Use seed passwords of at least 8 JavaScript string units and no more than 72 UTF-8 bytes so they fit the application's password rules. The seed script does not validate these values itself.

`db.js` calls `require('dotenv').config()`. Run backend commands from `backend/` so dotenv finds this file. `PORT` has no fallback in `server.js`; keep it set to `3000` to match the proxy configuration.

`.env` is ignored by Git. Do not commit environment files, credentials, session secrets, or database dumps. Do not put secrets in frontend code or `VITE_` variables.

Create the initial accounts:

```powershell
node src/seed.js
```

This inserts usernames `member` and `manager` using the two private seed passwords. Passwords are hashed with bcrypt cost 10. Rerunning the script skips existing usernames: it does not reset their passwords or reactivate deleted accounts. IDs are generated by PostgreSQL and are not hardcoded into application permissions.

Install frontend dependencies:

```powershell
cd ../frontend
npm.cmd ci
```

`npm ci` installs versions from each package's lockfile. `npm.cmd` avoids the PowerShell `npm.ps1` execution-policy issue without changing the policy.

### 4. Start both servers

In one terminal, from `leave-request/backend`:

```powershell
npm.cmd start
```

The backend starts at `http://127.0.0.1:3000`. Its start script runs `node src/server.js`; there is no backend development/watch script. Restart it manually after backend code changes.

In another terminal, from `leave-request/frontend`:

```powershell
npm.cmd run dev
```

Open **http://localhost:5173** and keep using that hostname for the browser session. If Vite reports another port, use the address it prints. Keep both terminals open; use `Ctrl+C` to stop each server.

The Vite proxy in `frontend/vite.config.js` targets `http://localhost:3000` and removes the `/api` prefix. For example, `/api/login` reaches Express as `/login`. Relative API requests use the browser's session cookie; no token in local storage is needed.

### 5. Verify the local app

In another PowerShell terminal:

```powershell
curl.exe -i http://127.0.0.1:3000/current
```

Without a session, expect HTTP `401` and `{"message":"Please log in."}`. This confirms the protected route responds; a successful browser login also checks the account query and session storage. The temporary health route has been removed.

In the browser:

1. Log in as `member` using the private seed password, submit a request, and confirm it appears in the personal list.
2. Use a separate browser context for `manager`, view the request, and change its status.
3. Reload the member page to see the updated status.
4. Refresh while signed in to check session restoration, then log out.
5. Use a disposable registered member to check soft deletion without disabling the seeded demonstration accounts.

Registration creates a member but does not log it in automatically. After deletion, the account and requests remain; the next protected request and a fresh login are rejected. Managers still see the history, but status buttons for that applicant are replaced with a deleted-account message.

Check the frontend production build from `frontend/`:

```powershell
npm.cmd run build
```

## Deploy to a Linux server with PM2 and Nginx

This is a minimal Ubuntu deployment at `/opt/leave-request`. PostgreSQL stores data, PM2 manages the backend process, and Nginx serves static files and forwards API requests. The server needs SSH access and a user with `sudo` privileges.

On a shared or already configured VM, inspect existing processes, databases, and enabled Nginx sites before changing them. Skip installation and creation steps for resources already prepared for this application. Do not delete unrelated services or rerun schema/restore commands over an existing populated database.

Assume the provider exposes these inbound ports:

| Port | Purpose |
| --- | --- |
| 22 | SSH and SCP |
| 80 | HTTP website and API through Nginx |
| 443 | Available for HTTPS; this guide does not configure TLS |

Ports `3000`, `5173`, and `5432` do not need public access.

This guide ends with an **HTTP** website. Password hashing protects stored passwords, and cookie signing detects tampering; neither encrypts browser traffic. HTTP exposes credentials and session cookies in transit. Use this as a learning/demo deployment with non-sensitive data and passwords not reused elsewhere. HTTPS is required before treating it as a real leave-management service.

Replace `YOUR_SERVER_IP` and `YOUR_SSH_USER` below with your server details.

### 1. Connect and check the required tools

From Windows PowerShell:

```powershell
ssh YOUR_SSH_USER@YOUR_SERVER_IP
```

On the Linux server, inspect the current setup:

```bash
node --version
npm --version
psql --version
pm2 status
sudo systemctl status postgresql nginx --no-pager
sudo ss -ltnp
sudo ls -l /etc/nginx/sites-enabled/
```

A command may be unavailable on a new VM. Install missing system packages as needed:

```bash
sudo apt update
sudo apt install git nodejs npm postgresql nginx
```

Check the Node version afterward. If the Ubuntu package is older than Node.js 24, install a supported release using the [Node.js installation options](https://nodejs.org/en/download) before running `npm ci`.

PostgreSQL's service can show `active (exited)` because it manages database clusters. If connections fail, inspect `pg_lsclusters`.

If UFW is already active, preserve SSH access and allow HTTP where necessary:

```bash
sudo ufw status
# Only if UFW is active and these ports are not already allowed:
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
```

### 2. Clone the project and install dependencies

For a new checkout:

```bash
cd /opt
sudo git clone https://github.com/kwanyinsan/leave-request.git
sudo chown -R "$(id -un):$(id -gn)" /opt/leave-request
```

If `/opt/leave-request` already exists, inspect its `git status` and current version rather than cloning over it. Preserve its private environment file. Run the application and PM2 as the same account used for the deployment.

Install dependencies from the project directory:

```bash
cd /opt/leave-request/backend
npm ci
cd ../frontend
npm ci
```

### 3. Create the database and load the schema or existing data

For a new database:

```bash
sudo -u postgres psql
```

At the `psql` prompt:

```sql
CREATE ROLE leave_request_app WITH LOGIN;
\password leave_request_app
CREATE DATABASE leave_request OWNER leave_request_app;
\q
```

Choose **one** option for the new, empty database. Do not run both.

#### Option A: Start with new accounts and no requests

```bash
psql -h 127.0.0.1 -U leave_request_app -d leave_request -W -v ON_ERROR_STOP=1 -1 -f /opt/leave-request/database/schema.sql
```

Configure the environment in the next step, then run the seed script to create the initial accounts.

#### Option B: Migrate an existing local database

On **Windows PowerShell**, export and transfer the database:

```powershell
pg_dump -h localhost -U leave_request_app -d leave_request -W --no-owner --no-acl -f "$HOME\Downloads\leave_request.sql"
scp "$HOME\Downloads\leave_request.sql" YOUR_SSH_USER@YOUR_SERVER_IP:leave_request.sql
```

Use the PostgreSQL `bin` PATH setup from the local instructions if needed. Use a `pg_dump` matching the source PostgreSQL major version; restoring into an older major version is not guaranteed to work.

The dump includes schema, account/request data, any session records, and sequence values. `--no-owner --no-acl` omits the old ownership and permission settings. Restore as `leave_request_app` so the restored objects belong to that role. Database roles and their passwords are created separately.

Keep the dump private and outside the repository and public frontend directory. It contains password hashes and may contain usable session data.

On **Linux**, restore it from the SSH user's home directory:

```bash
psql -h 127.0.0.1 -U leave_request_app -d leave_request -W -v ON_ERROR_STOP=1 -1 -f "$HOME/leave_request.sql"
```

This is a plain SQL dump, so use `psql` rather than `pg_restore`. Preserve the restored sequence values; do not reset or renumber account/request IDs. Existing accounts keep their stored passwords.

For either option, verify the application tables and their owner:

```bash
psql -h 127.0.0.1 -U leave_request_app -d leave_request -W
```

At the `psql` prompt:

```sql
SELECT current_database(), current_user;
\dt
SELECT id, username, role, is_deleted FROM users ORDER BY id;
\q
```

The session table appears when the store needs it if it was not already restored.

### 4. Configure and verify the backend

```bash
cd /opt/leave-request/backend
touch .env
chmod 600 .env
nano .env
```

Use the same variable names shown in the Windows setup, with the Linux database password and private server values. Generate a session secret with the Node crypto command shown earlier. Keep it stable across normal restarts; changing it invalidates cookies signed with the previous secret.

`chmod 600` allows only the file owner to read and write `.env`. It stays outside Nginx's public frontend directory.

For a new database using Option A, run:

```bash
node src/seed.js
```

For a migrated database, the accounts are already present. Rerunning the seed does not replace their passwords.

If no backend is already listening on port 3000, start it manually:

```bash
npm start
```

In a second SSH terminal:

```bash
curl -i http://127.0.0.1:3000/current
```

Expect HTTP `401` with `Please log in.` without a session. Do not use a health endpoint. Stop the manually started process with `Ctrl+C` before creating its PM2 entry.

### 5. Keep the backend running with PM2

Install PM2 only if it is not already available:

```bash
sudo npm install -g pm2
```

Inspect `pm2 status` before starting another process. If Leave Request already has an entry, use its actual name or ID for logs and restart. Do not create a duplicate process on port 3000.

For a new entry:

```bash
cd /opt/leave-request/backend
pm2 start "npm start" --name leave-request-backend
pm2 status
pm2 logs leave-request-backend
```

`leave-request-backend` is the name assigned by this example; an existing deployment may have another name. The start script runs `node src/server.js`, and dotenv loads `backend/.env` from the working directory.

Press `Ctrl+C` to leave the log viewer without stopping the app.

Configure boot persistence:

```bash
pm2 startup
```

If PM2 prints an additional `sudo ...` command, run that exact command. Then save the process list:

```bash
pm2 save
```

`pm2 startup` configures the boot service; `pm2 save` records processes to restore. Use the same operating-system account consistently; `pm2` and `sudo pm2` manage different users' process lists.

For the example process name:

```bash
pm2 status
pm2 logs leave-request-backend
pm2 restart leave-request-backend
```

Use the actual existing name/ID when it differs. After changing which processes should return at boot, run `pm2 save` again.

### 6. Build the frontend

```bash
cd /opt/leave-request/frontend
npm run build
```

Vite creates `frontend/dist/index.html` and compiled assets. Nginx serves these files; the Vite development server is not needed on the VM.

### 7. Configure Nginx

Inspect enabled sites before editing:

```bash
sudo ls -l /etc/nginx/sites-enabled/
sudo nginx -T
```

For an existing Leave Request site, back up and edit its actual configuration file. Do not add a second server block for the same host or overwrite an unrelated site.

On a new setup, create a site file:

```bash
sudo nano /etc/nginx/sites-available/leave-request
```

Use this server block, replacing `YOUR_SERVER_IP`:

```nginx
server {
    listen 80;
    listen [::]:80;

    root /opt/leave-request/frontend/dist;
    index index.html;

    server_name YOUR_SERVER_IP;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
    }
}
```

- `root` points only to the built frontend, not the repository or backend environment file.
- `try_files` serves existing files or falls back to React's entry page.
- `location /api/` forwards API requests to Express.
- The trailing slash in `proxy_pass` replaces the matching `/api/` prefix. `/api/login` reaches Express as `/login`; `/api/approve/5` reaches it as `/approve/5`.
- The Vite development proxy does not configure production Nginx.

For a newly created site file only, enable it if it is not already linked:

```bash
sudo ln -s /etc/nginx/sites-available/leave-request /etc/nginx/sites-enabled/leave-request
```

If a file/link already exists, inspect it instead of replacing it. Preserve unrelated enabled sites. Test and apply:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Only reload after validation succeeds.

### 8. Verify the deployed website

On the Linux server, use the configured hostname/IP in the Host header:

```bash
curl -i -H 'Host: YOUR_SERVER_IP' http://127.0.0.1/
curl -i -H 'Host: YOUR_SERVER_IP' http://127.0.0.1/api/current
```

Expect HTML with HTTP `200` for `/`, and JSON with HTTP `401` for an unauthenticated `/api/current`. A 401 here is expected, not a failed deployment.

From your computer, open **http://YOUR_SERVER_IP** and check:

1. Member login, submission, and personal request visibility.
2. Manager login, applicant usernames, and a status change.
3. The member sees that change after refreshing.
4. A known submitted date displays as the original calendar date.
5. Refresh restores the signed-in view; logout returns to the form.
6. The app remains reachable after closing SSH.

Use a disposable account for deletion checks. Confirm that its history remains visible, controls are hidden, and deleted-account access is denied.

The frontend formats dates with `Asia/Hong_Kong`, but the backend's timestamp conversion can depend on the server timezone. Check a known date rather than assuming a raw UTC timestamp's date is the intended leave date.

If checking reboot persistence, do it at a suitable time for the shared VM, then reconnect and inspect PM2 and the website. Startup configuration alone is not evidence that a reboot test has been performed.

## File locations on the server

| Location | Contents |
| --- | --- |
| `/opt/leave-request` | Cloned project |
| `/opt/leave-request/backend/.env` | Database settings, session secret, and private seed passwords |
| `/opt/leave-request/backend/src/server.js` | API routes, sessions, and permission middleware |
| `/opt/leave-request/frontend/dist` | Generated frontend files served publicly |
| `/etc/nginx/sites-available/` | Site configuration; inspect which file serves this application |
| `/etc/nginx/sites-enabled/` | Enabled site links |
| `~/leave_request.sql` | Private transferred dump, if using migration |
| `~/.pm2/` | PM2 logs, state, and saved process list for the deployment user |
| `/var/log/nginx/` | Nginx access and error logs |

PostgreSQL stores the live database separately from the repository and dump. To inspect its data directory, run `sudo -u postgres psql -c 'SHOW data_directory;'`.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `psql` or `pg_dump` not found on Windows | Add PostgreSQL's `bin` directory to the session PATH or use its full executable path. |
| PowerShell blocks `npm.ps1` | Use `npm.cmd` as shown above. |
| Backend fails to start | Check the working directory, `backend/.env`, required `PORT`, database service, and process logs. |
| `relation "users" does not exist` | Confirm the schema/restore ran in the database named by `PGDATABASE`. |
| Seed fails or seeded login is rejected | Check private seed values, existing account/deletion state, and database connection. Rerunning the seed does not reset passwords. |
| `EADDRINUSE` | Inspect the process already using port 3000; avoid a manual backend and PM2 duplicate. |
| Nginx returns `502 Bad Gateway` | Check PM2 and `curl -i http://127.0.0.1:3000/current`; confirm the backend port. A 401 from this route is expected without login. |
| API request returns HTML instead of JSON | Check the enabled Nginx site, `/api/` location, and trailing slash in `proxy_pass`. |
| Login seems lost | Use one browser hostname consistently; inspect session configuration, database access, and whether the account was deleted. |
| Manager action returns `403` | The current session belongs to a member or otherwise lacks the manager role. |
| Status update returns `404` | The request may not exist or its applicant is deleted. |
| Nginx cannot read the frontend | Check `dist/index.html`, directory traversal/read permissions, and Nginx error logs. Do not make `.env` public. |
| Local server works but public access fails | Check the configured host/IP, provider port-80 rule, and active OS firewall rules. |
| Frontend changes are missing | Rebuild; source changes do not automatically update `dist`. |
| Leave dates display incorrectly | Check a known submitted date and the backend/server timezone conversion; the UI formats timestamps in Hong Kong time. |

## API

These are the direct Express routes. Through Vite or Nginx, prepend `/api`.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/register` | Public | Create a member account |
| POST | `/login` | Public | Verify credentials and establish a session |
| POST | `/logout` | Current session | Destroy the session and clear its cookie |
| GET | `/current` | Authenticated | Return the current account |
| POST | `/submit` | Authenticated | Create a request for the current account |
| GET | `/requests` | Authenticated | Members see their own requests; managers see all with applicant details |
| POST | `/approve/:id` | Manager | Change status for a request whose applicant is active |
| GET | `/members` | Manager | List active and deleted member accounts |
| DELETE | `/delete/:id` | Manager | Soft-delete an active member |

Registration/login accept `username` and `password`. Submission accepts `start_date`, `end_date`, and `reason`. Status changes accept `status` as `pending`, `approved`, or `rejected`. Send these bodies as JSON with `Content-Type: application/json`.

Registration returns `201` and does not log in automatically. It preserves usernames without trimming, checks 1–50 JavaScript string units, requires passwords of at least 8 string units and at most 72 UTF-8 bytes, and always assigns `member`. Duplicate usernames return `409`. Login requires a nonempty password and the same byte maximum.

The session cookie is `connect.sid` with an eight-hour configured lifetime. Protected requests reload the account and reject missing, deleted, or unsupported-role accounts. Manager routes additionally check the manager role. Deleted-account login intentionally shares the message `Invalid username or password.` with other invalid credentials.

Request creation uses the authenticated account ID, not a submitted applicant ID. It checks nonempty strings, date format, and date order. Space-only reasons are allowed. Impossible calendar dates rely on PostgreSQL rejection and currently receive a generic `500` response. Handlers directly destructure `req.body`; requests without a parsed body are a known limitation.

Managers may revise any current request status, including returning it to pending. `decided_by` records the latest acting manager, including a reset; there is no decision history. The backend rejects changes for deleted applicants, independently of the hidden frontend controls. Managers can submit through the API, though their interface has no submission form.

The database enforces primary keys, username uniqueness, required fields, the date-order check, and both `ON DELETE RESTRICT` foreign keys. Allowed role/status values are enforced in the backend, not database enums or allowed-value checks. Soft deletion preserves the user row, username reservation, and requests. No account editing or restoration interface is provided.

## References

The commands above are adapted for this repository's folders, scripts, and routes.

- [React: useState](https://react.dev/reference/react/useState)
- [React: useEffect](https://react.dev/reference/react/useEffect)
- [Express: Routing](https://expressjs.com/en/guide/routing.html)
- [Express-session: Configuration and login example](https://expressjs.com/en/resources/middleware/session/)
- [connect-pg-simple: PostgreSQL session storage](https://github.com/voxpelli/node-connect-pg-simple)
- [bcryptjs: Hashing and comparison](https://github.com/dcodeIO/bcrypt.js)
- [dotenv: Usage](https://github.com/motdotla/dotenv#usage)
- [node-postgres: Parameterized queries](https://node-postgres.com/features/queries)
- [PostgreSQL: Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL: pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL: psql](https://www.postgresql.org/docs/current/app-psql.html)
- [npm: npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [Ubuntu: Package management](https://documentation.ubuntu.com/server/how-to/software/package-management/)
- [PM2: Quick start](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2: Startup and saved processes](https://pm2.keymetrics.io/docs/usage/startup/)
- [Vite: Deploying a static site](https://vite.dev/guide/static-deploy.html)
- [Nginx: proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)

