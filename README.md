# CSPC Supreme Student Council website

The SSC information disclosure website provides official documents, officer profiles,
platform credits, PDF viewing and QR sharing, and a council document-management dashboard.
The current presentation is **SIKLAB: CSPC Intramurals 2026**, November 23–28, 2026.

- **Website:** [cspcssc.ct.ws](https://cspcssc.ct.ws/)
- **Official tally board:** [www.siklab2026.app](https://www.siklab2026.app)
- **Comprehensive developer guide:** [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)
- **Work plan:** [OVERHAUL_PLAN.md](OVERHAUL_PLAN.md)
- **Historical deployment and recovery evidence:** [DEPLOYMENT_BASELINE.md](DEPLOYMENT_BASELINE.md)

Documentation reviewed November 23, 2026, using the Asia/Taipei calendar date.

## Current experience

| Page | Behavior |
| --- | --- |
| Home | SIKLAB video loop, event dates, external tally-board button, seven college logos, flipping document-category cards, and a desktop executive-officer rail. Ordinary scrolling; no snapping. |
| Officers | AY 2024–2025, 2025–2026 and 2026–2027 rosters; year tabs switch in place. Separate office sections on a stationary background. |
| Documents | Search, office categories, 12 records per page, desktop grid/list selection, PDF viewer, downloads and a centered QR dialog. Mobile uses list view and hides office holders. |
| About | Original five platform proponents, their project credits and service histories. Active officers derive current positions and portraits from the shared roster; profile dialogs are centered and responsive. |
| Login and dashboard | Session-based sign-in, administrator document management, read-only member access, report export and enhanced file selection. Publishing tools use a separate tab. |

SIKLAB remains active until explicitly changed in `includes/theme.php`. There is no
theme selector or December 5 expiry. Saved event announcements are omitted from Home;
announcement publishing/removal is disabled in the dashboard while SIKLAB is active.
The Regular template and older parallax assets remain for later work.

The current roster has **53 officers in 19 offices**, including eight executives.
Mobile executive cards are larger; other officer cards use a compact layout. Search
and office-jump controls are desktop features. Shared navigation has an animated mobile
menu; the public header has no Council login button. Sign in through `/login.php` or
the footer.

## Stack and requirements

Vanilla PHP, MySQL/MariaDB, CSS and JavaScript; no frontend bundling step is required.
Composer supplies TCPDF. Flowbite assets are vendored; PDF.js, fonts, icons, QR generation
and some legacy pages use external services. See the guide for the dependency map.

For the supported Windows/VS Code setup:

- PHP **8.3+** and Composer on PATH, with `composer.phar` beside its launcher.
- PHP extension binaries for `mysqli` and `gd`, plus `fileinfo` for upload validation.
- Python **3.10+**.
- XAMPP/MariaDB binaries at `C:\xampp\mysql\bin`, or set `SSC_MYSQL_BIN` before setup.
- Node.js **22** matches CI and runs the JavaScript tests. npm restores locked tooling.

## Run locally in VS Code

From the repository root:

```powershell
python scripts/dev.py setup
python scripts/dev.py serve
```

Open **http://127.0.0.1:8000/**. VS Code also provides **Terminal → Run Task →
SSC: Set up local environment** and **SSC: Start local website**.

Setup installs locked PHP dependencies, provisions a dedicated MariaDB instance on
`127.0.0.1:33079`, migrates `ssc_dev`, and seeds synthetic accounts and three PDFs.
It preserves an existing unmanaged private database config outside the repository
before writing development settings. Repeated setup preserves existing accounts and
generated passwords; it is not a password-reset command.

The account emails are `admin@example.test` and `member@example.test`. Read their generated
passwords privately from ignored `config/dev.local.json`. Production credentials do not
sign in to this synthetic database. Administrators manage records; members are read-only.

The launcher enables mysqli/GD for its PHP processes without changing global `php.ini`.
Its router enforces private-path restrictions that PHP's built-in server otherwise lacks.
Use the launcher for local previews. Ctrl+C stops PHP; the database remains running.

| Command | Purpose |
| --- | --- |
| `python scripts/dev.py doctor` | Check the project PHP invocation. |
| `python scripts/dev.py status` | Start the dedicated database if needed and show table counts. |
| `python scripts/dev.py migrate` | Apply new development migrations. |
| `python scripts/dev.py seed` | Add missing synthetic fixtures without resetting existing accounts. |
| `python scripts/dev.py stop-web` | Stop this workspace's PHP launcher. |
| `python scripts/dev.py stop-db` | Stop the dedicated database after checking its identity. |

Private runtime state lives under `%LOCALAPPDATA%\SSCWebsiteDev\<workspace-id>`.
The launcher leaves the separate database service on port 3306 alone. Details for other
platforms and troubleshooting are in the [developer guide](docs/DEVELOPER_GUIDE.md).

## Configuration and private files

The application reads ignored `config/database.local.php`, with `DB_SERVER`,
`DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` and optional `DB_PORT` environment overrides.
For a manually configured environment, copy `config/database.example.php` only when
the destination does not already exist. The file returns `server`, `username`,
`password`, `name` and optional `port` values. `.env` files are not loaded automatically.

Missing settings or a failed connection produce a generic HTTP 503. Production uses
its own private host config; never replace it with this checkout's development file.

Credentials, database exports, backups, generated dependencies, raw source media and
new uploads are ignored. Some historical uploads are still tracked, but **the release
packager excludes the entire uploads tree**. Keep private snapshots outside the checkout
and web root. Ignoring a secret does not remove it from older Git history.

## Checks

```powershell
npm ci --ignore-scripts --no-audit --no-fund
node --test tests/*.test.mjs
python scripts/dev.py test
python scripts/build_release.py
git diff --check
```

The local Python launcher creates a disposable `ssc_test_*` database and removes it
after the suite; it does not reset `ssc_dev`. Plain `python -m unittest discover -s tests -v`
runs safeguards/configuration tests but skips application integration unless the dedicated
test environment is configured. The latest UI verification ran 70 JavaScript tests and
40 Python/integration tests; use actual results when the suite changes.

`build/release/` is a generated runtime package, not a backup. Browser checks remain
necessary for layout, focus, animation, touch interaction and signed-in production flows.

## Deployment to InfinityFree

The fork deploys through the manual **Deploy to InfinityFree** GitHub Actions workflow.
Pushes and pull requests run CI; a push or merge alone does not publish the website.
Uploads are permitted only from this fork's `main` branch and `production` environment.

| Production environment setting | Value or source |
| --- | --- |
| Variable `FTP_SERVER` | `ftpupload.net` |
| Variable `FTP_REMOTE_DIR` | `/cspcssc.ct.ws/htdocs/` |
| Secret `FTP_USERNAME` | Hosting account FTP Details, entered privately on GitHub. |
| Secret `FTP_PASSWORD` | Hosting account FTP Details, entered privately on GitHub. |

1. Prepare a current private backup of live files, uploads and the database. An old
   backup does not cover documents added afterward.
2. Commit and push the intended source to `main`, after appropriate checks/review.
3. Run the workflow on `main` with `dry_run=true` for a read-only FTPS preflight.
4. After verifying the backup and preview, run with `dry_run=false` and
   `backups_confirmed=true`. The flag is an operator declaration; it does not create a backup.
5. Monitor completion and verify live content, media, PDFs, private-path restrictions,
   and authorized dashboard/report workflows.

The workflow rebuilds and uploads the full runtime allowlist over verified explicit
FTPS. It preserves private config, uploads and host-specific `.htaccess` directives;
it runs no database migrations or remote deletions. Individual files use temporary
uploads followed by rename. The whole release is not atomic. Recent full transfers
took roughly 9–14 minutes. See the guide for the exact preflight, release exclusions,
failure handling and rollback procedure.

## Release evidence and remaining work

The November 22, 2026 rollout and follow-ups succeeded:

| Change | Source | Deployment run |
| --- | --- | --- |
| SIKLAB overhaul | `0c25ded` | [45035544631](https://github.com/mrfahrenheit0528/SSC-Website-Vanilla/actions/runs/45035544631) |
| Remove Home announcement link; center QR dialog | `20e978b` | [45037565068](https://github.com/mrfahrenheit0528/SSC-Website-Vanilla/actions/runs/45037565068) |
| Refresh proponent profiles and current positions | `453ba3f` | [45039895702](https://github.com/mrfahrenheit0528/SSC-Website-Vanilla/actions/runs/45039895702) |

Public HTTP checks verified pages, existing PDF links, selected asset hashes and denied
private routes. The library grew from 47 to 84 documents during live use; those figures
are historical observations, not fixed totals or migration assertions. Browser visual QA
and signed-in production verification remain incomplete. The tally-board URL change is
in source commit `f840b7a`; confirm its production workflow before treating it as deployed.

Known follow-ups include the Regular theme redesign, legacy registration and PDF-serving
hardening, report-category alignment, and full browser/accessibility verification.
The [developer guide](docs/DEVELOPER_GUIDE.md) documents these boundaries and maintenance
recipes. [LICENSE](LICENSE) contains the repository's license.
